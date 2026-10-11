
import os
import re
import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import Literal
from zoneinfo import ZoneInfo

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv(Path(__file__).resolve().parent / ".env")

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
AIR_QUALITY_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
ROUTES_TIMEOUT = httpx.Timeout(20.0, connect=5.0)
GEOCODING_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
AIR_QUALITY_ATTEMPTS = 2
logger = logging.getLogger("airguard.providers")
FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:3000,http://localhost:5173",
    ).split(",")
    if origin.strip()
]

app = FastAPI(title="AirGuard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RecommendationRequest(BaseModel):
    latitude: float = 18.5204
    longitude: float = 73.8567
    origin: str = "Shivajinagar, Pune, India"
    destination: str = "Hinjawadi, Pune, India"
    origin_latitude: float | None = None
    origin_longitude: float | None = None
    destination_latitude: float | None = None
    destination_longitude: float | None = None
    has_asthma: bool = False
    health_profile: Literal[
        "general", "asthma_sensitive", "outdoor_worker", "pollution_sensitive"
    ] = "general"
    departure_hour: int = Field(default=8, ge=0, le=23)
    routes: list[dict] | None = None



async def get_air_quality(
    latitude: float,
    longitude: float,
    include_forecast: bool = False,
):
    url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": (
            "us_aqi,pm2_5,pm10,carbon_monoxide,"
            "nitrogen_dioxide,sulphur_dioxide,ozone"
        ),
        "timezone": "Asia/Kolkata",
    }
    if include_forecast:
        params["hourly"] = "us_aqi,pm2_5"
        params["forecast_days"] = 2

    for attempt in range(AIR_QUALITY_ATTEMPTS):
        try:
            async with httpx.AsyncClient(timeout=AIR_QUALITY_TIMEOUT) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as exc:
            logger.warning(
                "Open-Meteo returned status %s for air quality request.",
                exc.response.status_code,
            )
            raise HTTPException(
                status_code=502,
                detail={
                    "code": "AIR_QUALITY_UPSTREAM_ERROR",
                    "message": "Open-Meteo could not provide current air quality.",
                    "provider": "Open-Meteo",
                    "upstream_status": exc.response.status_code,
                },
            ) from exc
        except httpx.TimeoutException as exc:
            if attempt + 1 < AIR_QUALITY_ATTEMPTS:
                logger.warning("Open-Meteo timed out; retrying current air quality request.")
                await asyncio.sleep(0.25)
                continue
            logger.warning("Open-Meteo air quality request timed out after retry.")
            raise HTTPException(
                status_code=502,
                detail={
                    "code": "AIR_QUALITY_TIMEOUT",
                    "message": "Open-Meteo timed out while loading current air quality.",
                    "provider": "Open-Meteo",
                },
            ) from exc
        except (httpx.RequestError, ValueError) as exc:
            if attempt + 1 < AIR_QUALITY_ATTEMPTS:
                logger.warning(
                    "Open-Meteo air quality request failed (%s); retrying.",
                    type(exc).__name__,
                )
                await asyncio.sleep(0.25)
                continue
            logger.warning("Open-Meteo air quality request failed: %s", type(exc).__name__)
            raise HTTPException(
                status_code=502,
                detail={
                    "code": "AIR_QUALITY_UNAVAILABLE",
                    "message": "Open-Meteo air quality data is temporarily unavailable.",
                    "provider": "Open-Meteo",
                },
            ) from exc


def unavailable_route(
    mode: str,
    code: str,
    message: str,
    upstream_status: int | None = None,
):
    result = {
        "mode": mode.lower(),
        "available": False,
        "error": {
            "code": code,
            "message": message,
            "provider": "Google Routes",
        },
    }
    if upstream_status is not None:
        result["error"]["upstream_status"] = upstream_status
    return result



def make_waypoint(
    location_str: str,
    lat: float | None = None,
    lng: float | None = None,
) -> dict:
    if lat is not None and lng is not None:
        return {"location": {"latLng": {"latitude": float(lat), "longitude": float(lng)}}}
    cleaned = location_str.strip()
    coord_match = re.match(
        r"^[-+]?([1-8]?\d(?:\.\d+)?|90(?:\.0+)?)[,\s]+[-+]?(180(?:\.0+)?|(?:1[0-7]\d|[1-9]?\d)(?:\.\d+)?)$",
        cleaned,
    )
    if coord_match:
        parts = [p.strip() for p in cleaned.split(",")] if "," in cleaned else cleaned.split()
        return {"location": {"latLng": {"latitude": float(parts[0]), "longitude": float(parts[1])}}}
    return {"address": cleaned}


async def fetch_route(
    origin: str,
    destination: str,
    mode: str,
    origin_lat: float | None = None,
    origin_lng: float | None = None,
    dest_lat: float | None = None,
    dest_lng: float | None = None,
):
    if not GOOGLE_MAPS_API_KEY:
        logger.error("Google Routes API key is not configured.")
        return unavailable_route(
            mode,
            "GOOGLE_ROUTES_NOT_CONFIGURED",
            "Google Routes is not configured on the server.",
        )

    url = "https://routes.googleapis.com/directions/v2:computeRoutes"
    payload = {
        "origin": make_waypoint(origin, origin_lat, origin_lng),
        "destination": make_waypoint(destination, dest_lat, dest_lng),
        "travelMode": mode,
        "units": "METRIC",
    }

    if mode == "DRIVE":
        payload["routingPreference"] = "TRAFFIC_UNAWARE"

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
    }

    try:
        async with httpx.AsyncClient(timeout=ROUTES_TIMEOUT) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPStatusError as exc:
        provider_status = None
        provider_message = None
        try:
            error_body = exc.response.json().get("error", {})
            provider_status = error_body.get("status")
            provider_message = error_body.get("message")
        except ValueError:
            pass
        logger.warning(
            "Google Routes %s request failed: HTTP %s, provider status=%s, message=%s",
            mode,
            exc.response.status_code,
            provider_status,
            provider_message,
        )
        return unavailable_route(
            mode,
            "GOOGLE_ROUTES_UPSTREAM_ERROR",
            f"Google Routes could not calculate the {mode.lower()} route.",
            exc.response.status_code,
        )
    except httpx.TimeoutException:
        logger.warning("Google Routes %s request timed out.", mode)
        return unavailable_route(
            mode,
            "GOOGLE_ROUTES_TIMEOUT",
            f"Google Routes timed out while calculating the {mode.lower()} route.",
        )
    except (httpx.RequestError, ValueError) as exc:
        logger.warning("Google Routes %s request failed: %s", mode, type(exc).__name__)
        return unavailable_route(
            mode,
            "GOOGLE_ROUTES_UNAVAILABLE",
            f"Google Routes could not calculate the {mode.lower()} route.",
        )

    routes = data.get("routes", [])
    if not routes:
        return unavailable_route(
            mode,
            "GOOGLE_ROUTES_NO_ROUTE",
            f"Google Routes found no {mode.lower()} route for this corridor.",
        )

    try:
        route = routes[0]
        distance_meters = float(route["distanceMeters"])
        seconds = float(str(route["duration"]).removesuffix("s"))
        if distance_meters < 0 or seconds <= 0:
            raise ValueError("Route values must be positive")
    except (KeyError, TypeError, ValueError) as exc:
        logger.warning("Google Routes %s response was malformed: %s", mode, type(exc).__name__)
        return unavailable_route(
            mode,
            "GOOGLE_ROUTES_MALFORMED_RESPONSE",
            f"Google Routes returned incomplete {mode.lower()} route data.",
        )

    result = {
        "mode": mode.lower(),
        "available": True,
        "distance_km": round(distance_meters / 1000, 2),
        "duration_minutes": max(1, round(seconds / 60)),
    }
    polyline = route.get("polyline", {}).get("encodedPolyline")
    if isinstance(polyline, str) and polyline:
        result["encoded_polyline"] = polyline
    return result


async def calculate_routes(
    origin: str,
    destination: str,
    origin_lat: float | None = None,
    origin_lng: float | None = None,
    dest_lat: float | None = None,
    dest_lng: float | None = None,
):
    return await asyncio.gather(
        fetch_route(origin, destination, "DRIVE", origin_lat, origin_lng, dest_lat, dest_lng),
        fetch_route(origin, destination, "TRANSIT", origin_lat, origin_lng, dest_lat, dest_lng),
        fetch_route(origin, destination, "WALK", origin_lat, origin_lng, dest_lat, dest_lng),
    )


def place_result(result: dict) -> dict | None:
    geometry = result.get("geometry", {})
    location = geometry.get("location", {}) if isinstance(geometry, dict) else {}
    latitude = location.get("lat") if isinstance(location, dict) else None
    longitude = location.get("lng") if isinstance(location, dict) else None
    address = result.get("formatted_address")
    if not isinstance(address, str) or not isinstance(latitude, (int, float)) or not isinstance(longitude, (int, float)):
        return None
    return {
        "address": address,
        "latitude": latitude,
        "longitude": longitude,
        "place_id": result.get("place_id"),
    }


async def geocode(params: dict) -> list[dict]:
    if not GOOGLE_MAPS_API_KEY:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "GOOGLE_GEOCODING_NOT_CONFIGURED",
                "message": "Address search is not configured on the server.",
                "provider": "Google Geocoding",
            },
        )
    try:
        async with httpx.AsyncClient(timeout=GEOCODING_TIMEOUT) as client:
            response = await client.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={**params, "key": GOOGLE_MAPS_API_KEY},
            )
            response.raise_for_status()
            payload = response.json()
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=502, detail={"code": "GEOCODING_TIMEOUT", "message": "Address search timed out.", "provider": "Google Geocoding"}) from exc
    except (httpx.RequestError, httpx.HTTPStatusError, ValueError) as exc:
        logger.warning("Google Geocoding failed: %s", type(exc).__name__)
        raise HTTPException(status_code=502, detail={"code": "GEOCODING_UNAVAILABLE", "message": "Address search is temporarily unavailable.", "provider": "Google Geocoding"}) from exc

    status = payload.get("status")
    if status == "ZERO_RESULTS":
        return []
    if status != "OK":
        logger.warning("Google Geocoding returned status %s", status)
        raise HTTPException(status_code=502, detail={"code": "GEOCODING_UPSTREAM_ERROR", "message": "Google could not resolve that location.", "provider": "Google Geocoding"})
    return [place for item in payload.get("results", []) if (place := place_result(item))]


def get_aqi_status(aqi: float) -> str:
    if aqi <= 50:
        return "Good"
    if aqi <= 100:
        return "Moderate"
    if aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    if aqi <= 200:
        return "Unhealthy"
    if aqi <= 300:
        return "Very Unhealthy"
    return "Hazardous"


def hourly_aqi_by_hour(air_data: dict) -> dict[str, float]:
    """Return valid Open-Meteo hourly AQI values keyed by local ISO hour."""
    hourly = air_data.get("hourly")
    if not isinstance(hourly, dict):
        return {}
    times = hourly.get("time")
    values = hourly.get("us_aqi")
    if not isinstance(times, list) or not isinstance(values, list):
        return {}
    return {
        timestamp: float(aqi)
        for timestamp, aqi in zip(times, values)
        if isinstance(timestamp, str) and isinstance(aqi, (int, float))
    }


def departure_comparison(
    hourly_aqi: dict[str, float],
    departure_hour: int,
    route: dict,
    mode_factor: float,
) -> dict:
    """Compare the requested departure with nearby hours using the AQI forecast.

    The exposure index is an estimate: forecast city AQI × live route duration ×
    the documented mode factor. It is not a route-level measurement.
    """
    if not hourly_aqi:
        return {
            "available": False,
            "message": "Open-Meteo hourly AQI forecast is unavailable for time comparison.",
            "source": "Open-Meteo",
        }

    now = datetime.now(ZoneInfo("Asia/Kolkata"))
    candidates = []
    for hour in (departure_hour, departure_hour - 2, departure_hour + 2):
        if 0 <= hour <= 23 and hour not in candidates:
            candidates.append(hour)

    comparisons = []
    for hour in candidates:
        matching_times = sorted(
            timestamp
            for timestamp in hourly_aqi
            if timestamp >= now.strftime("%Y-%m-%dT%H:00")
            and timestamp[11:13] == f"{hour:02d}"
        )
        if not matching_times:
            continue
        timestamp = matching_times[0]
        aqi = hourly_aqi[timestamp]
        comparisons.append(
            {
                "time": timestamp,
                "departure_hour": hour,
                "aqi": round(aqi),
                "estimated_exposure_index": round(
                    max(aqi, 1) * route["duration_minutes"] * mode_factor, 2
                ),
                "travel_minutes": route["duration_minutes"],
            }
        )

    if not comparisons:
        return {
            "available": False,
            "message": "Open-Meteo has no upcoming hourly AQI forecast for the selected times.",
            "source": "Open-Meteo",
        }

    selected = next(
        (item for item in comparisons if item["departure_hour"] == departure_hour),
        None,
    )
    best = min(comparisons, key=lambda item: item["estimated_exposure_index"])
    return {
        "available": selected is not None,
        "source": "Open-Meteo hourly forecast",
        "assumption": (
            "Estimated exposure index = forecast city AQI × live route duration × "
            "travel-mode factor; it is not measured personal or route-specific exposure."
        ),
        "selected": selected,
        "alternatives": [item for item in comparisons if item is not selected],
        "best_available": best,
        "recommend_different_time": (
            selected is not None
            and best["departure_hour"] != departure_hour
            and best["estimated_exposure_index"] < selected["estimated_exposure_index"]
        ),
    }


@app.get("/")
def home():
    return {"message": "AirGuard backend is running"}


@app.get("/api/air-quality")
async def air_quality(
    latitude: float = 18.5204,
    longitude: float = 73.8567,
    include_forecast: bool = False,
):
    return await get_air_quality(latitude, longitude, include_forecast)


@app.get("/api/routes")
async def get_routes(
    origin: str = Query("Shivajinagar, Pune, India"),
    destination: str = Query("Hinjawadi, Pune, India"),
    origin_lat: float | None = Query(None, ge=-90, le=90),
    origin_lng: float | None = Query(None, ge=-180, le=180),
    dest_lat: float | None = Query(None, ge=-90, le=90),
    dest_lng: float | None = Query(None, ge=-180, le=180),
):
    routes = await calculate_routes(
        origin,
        destination,
        origin_lat=origin_lat,
        origin_lng=origin_lng,
        dest_lat=dest_lat,
        dest_lng=dest_lng,
    )
    return {
        "origin": origin,
        "destination": destination,
        "routes": routes,
    }


@app.get("/api/places/search")
async def search_places(query: str = Query(min_length=2, max_length=200)):
    """Server-side address search; the browser never receives the Google key."""
    places = await geocode({"address": query})
    return {"places": places[:5]}


@app.get("/api/places/reverse")
async def reverse_geocode(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
):
    places = await geocode({"latlng": f"{latitude},{longitude}"})
    if not places:
        return {
            "place": {
                "address": f"{latitude:.4f}, {longitude:.4f}",
                "latitude": latitude,
                "longitude": longitude,
                "place_id": None,
            }
        }
    return {"place": places[0]}


@app.post("/api/recommendation")
async def recommendation(request: RecommendationRequest):
    aq_lat = request.origin_latitude if request.origin_latitude is not None else request.latitude
    aq_lng = request.origin_longitude if request.origin_longitude is not None else request.longitude

    if request.routes is not None and len(request.routes) > 0:
        air_data = await get_air_quality(aq_lat, aq_lng, include_forecast=True)
        routes = request.routes
    else:
        air_data, routes = await asyncio.gather(
            get_air_quality(aq_lat, aq_lng, include_forecast=True),
            calculate_routes(
                request.origin,
                request.destination,
                origin_lat=request.origin_latitude,
                origin_lng=request.origin_longitude,
                dest_lat=request.destination_latitude,
                dest_lng=request.destination_longitude,
            ),
        )

    current = air_data.get("current", {})
    aqi = current.get("us_aqi")
    pm25 = current.get("pm2_5")

    if not isinstance(aqi, (int, float)):
        raise HTTPException(
            status_code=502,
            detail={
                "code": "AQI_MISSING_FROM_RESPONSE",
                "message": "Open-Meteo did not return a usable current AQI.",
                "provider": "Open-Meteo",
            },
        )

    aqi = float(aqi)
    if not isinstance(pm25, (int, float)):
        raise HTTPException(
            status_code=502,
            detail={
                "code": "PM25_MISSING_FROM_RESPONSE",
                "message": "Open-Meteo did not return a usable current PM2.5 value.",
                "provider": "Open-Meteo",
            },
        )
    pm25 = float(pm25)

    # Illustrative factors, not measured pollution by travel mode.
    mode_factors = {"drive": 0.80, "transit": 0.75, "walk": 1.15}
    profile_weights = {
        "general": (0.75, 0.25),
        "asthma_sensitive": (0.90, 0.10),
        "outdoor_worker": (0.85, 0.15),
        "pollution_sensitive": (0.85, 0.15),
    }
    exposure_weight, time_weight = profile_weights[request.health_profile]
    available = [r for r in routes if r.get("available")]

    if not available:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "ROUTES_UNAVAILABLE",
                "message": "Google Routes could not provide a usable route for this corridor.",
                "provider": "Google Routes",
                "routes": [
                    {
                        "mode": route["mode"],
                        "error": route.get("error"),
                    }
                    for route in routes
                ],
            },
        )

    for route in available:
        factor = mode_factors[route["mode"]]
        route["exposure_index"] = round(
            max(aqi, 1) * route["duration_minutes"] * factor, 2
        )
        route["data_source"] = "Google Routes (duration and distance); Open-Meteo (city AQI)"

    max_exposure = max(r["exposure_index"] for r in available) or 1
    max_time = max(r["duration_minutes"] for r in available) or 1

    for route in available:
        exposure_score = round(route["exposure_index"] / max_exposure * 100)
        time_score = round(route["duration_minutes"] / max_time * 100)
        combined_score = round(exposure_score * exposure_weight + time_score * time_weight)

        route["estimated_exposure_score"] = exposure_score
        route["travel_time_score"] = time_score
        route["recommendation_score"] = combined_score
        route["risk_score"] = exposure_score

    ranked = sorted(
        available,
        key=lambda r: (r["recommendation_score"], r["duration_minutes"]),
    )
    best = ranked[0]

    names = {
        "drive": "Private Car",
        "transit": "Public Transit",
        "walk": "Walking",
    }

    profile_labels = {
        "general": "General",
        "asthma_sensitive": "Asthma-sensitive",
        "outdoor_worker": "Outdoor worker",
        "pollution_sensitive": "Pollution-sensitive",
    }
    reason = (
        f"{names[best['mode']]} has the lowest combined estimated score "
        f"({best['recommendation_score']}/100) among available routes. For the "
        f"{profile_labels[request.health_profile]} profile, estimated exposure "
        f"has {round(exposure_weight * 100)}% of the ranking weight."
    )

    alternative = next((route for route in ranked if route["mode"] != best["mode"]), None)
    time_comparison = departure_comparison(
        hourly_aqi_by_hour(air_data),
        request.departure_hour,
        best,
        mode_factors[best["mode"]],
    )
    limitations = [
        "AQI is city-level data from Open-Meteo, not a route-specific measurement.",
        "Exposure indices are estimates based on AQI, duration, and documented mode factors.",
        "Google Routes availability and duration can change after this request.",
    ]
    if not time_comparison["available"]:
        limitations.append("Hourly AQI forecast was unavailable, so departure times were not ranked.")

    return {
        "origin": request.origin,
        "destination": request.destination,
        "aqi": round(aqi),
        "pm2_5": round(pm25, 1),
        "health_profile": {
            "id": request.health_profile,
            "label": profile_labels[request.health_profile],
            "exposure_weight": exposure_weight,
            "time_weight": time_weight,
            "has_asthma": request.has_asthma,
        },
        "routes": ranked,
        "recommendation": {
            "mode": best["mode"],
            "route": names[best["mode"]],
            "travel_minutes": best["duration_minutes"],
            "distance_km": best["distance_km"],
            "risk_score": best["estimated_exposure_score"],
            "recommendation_score": best["recommendation_score"],
            "suggested_departure": f"{request.departure_hour:02d}:00",
            "reason": reason,
        },
        "departure_comparison": time_comparison,
        "coach": {
            "why_selected": reason,
            "tradeoff": (
                f"It balances estimated exposure and travel time using the "
                f"{profile_labels[request.health_profile]} profile preferences."
            ),
            "data_support": [
                "Google Routes live duration and distance for available modes.",
                f"Open-Meteo current city AQI ({round(aqi)}).",
                "Open-Meteo hourly AQI forecast when a departure comparison is available.",
            ],
            "limitations": limitations,
            "alternative": (
                None
                if alternative is None
                else {
                    "mode": alternative["mode"],
                    "route": names[alternative["mode"]],
                    "travel_minutes": alternative["duration_minutes"],
                    "recommendation_score": alternative["recommendation_score"],
                }
            ),
        },
        "disclaimer": (
            "Scores compare current city-level AQI, route duration, and "
            "assumed travel-mode factors. They are not measured personal "
            "exposure or route-specific pollution. Forecast comparisons use "
            "Open-Meteo hourly city AQI when available."
        ),
    }
