import React, { useEffect, useRef, useState } from 'react';

import { INITIAL_TRANSIT_MODES } from '../../data';
import { RouteMap, MapPlace } from '../RouteMap';

import { FamilyProfile, HealthProfile, LanguageType, RouteOption } from '../../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '');
const AQI_REQUEST_TIMEOUT_MS = 25_000;
const RECOMMENDATION_REQUEST_TIMEOUT_MS = 30_000;
const ROUTES_REQUEST_TIMEOUT_MS = 25_000;

export type RecommendedRoute = {
  mode: 'drive' | 'transit' | 'walk';
  distance_km: number;
  duration_minutes: number;
  recommendation_score: number;
  risk_score: number;
  exposure_index?: number;
  encoded_polyline?: string;
};

export type DepartureOption = {
  time: string;
  departure_hour: number;
  aqi: number;
  estimated_exposure_index: number;
  travel_minutes: number;
};

export type RecommendationResponse = {
  origin: string;
  destination: string;
  aqi: number;
  pm2_5: number;
  routes: RecommendedRoute[];
  recommendation: {
    mode: 'drive' | 'transit' | 'walk';
    route: string;
    travel_minutes: number;
    distance_km: number;
    risk_score: number;
    recommendation_score: number;
    reason: string;
    suggested_departure?: string;
  };
  health_profile?: { id: HealthProfile; label: string; exposure_weight: number; time_weight: number };
  departure_comparison?: {
    available: boolean;
    message?: string;
    source?: string;
    assumption?: string;
    selected?: DepartureOption | null;
    alternatives?: DepartureOption[];
    best_available?: DepartureOption;
    recommend_different_time?: boolean;
  };
  coach?: {
    why_selected: string;
    tradeoff: string;
    data_support: string[];
    limitations: string[];
    alternative: { mode: string; route: string; travel_minutes: number; recommendation_score: number } | null;
  };
  disclaimer?: string;
};

export type RouteWithExposure = Omit<RouteOption, 'aqi' | 'aqiStatus'> & {
  aqi: number | null;
  aqiStatus: string;
  riskScore: number | null;
  recommendationScore: number | null;
  isRecommended: boolean;
  isLowestExposure: boolean;
  distanceKm: number | null;
  durationIsLive: boolean;
  unavailable: boolean;
  encodedPolyline?: string;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const routeIdForRecommendedMode = (mode: RecommendationResponse['recommendation']['mode']) => ({
  drive: 'transit-car',
  transit: 'transit-metro',
  walk: 'transit-walk',
}[mode]);

const getApiErrorMessage = async (response: Response): Promise<string> => {
  const fallback = `Route request failed: ${response.status}`;

  try {
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object') return fallback;
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === 'string') return detail;
    if (!detail || typeof detail !== 'object') return fallback;

    const error = detail as { code?: unknown; message?: unknown };
    if (typeof error.message !== 'string') return fallback;
    return typeof error.code === 'string'
      ? `${error.message} (${error.code})`
      : error.message;
  } catch {
    return fallback;
  }
};

const getAirQualityErrorMessage = async (response: Response): Promise<string> => {
  const fallback = `AQI request failed: ${response.status}`;

  try {
    const payload: unknown = await response.json();
    const detail = payload && typeof payload === 'object'
      ? (payload as { detail?: unknown }).detail
      : undefined;
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail === 'object') {
      const message = (detail as { message?: unknown }).message;
      if (typeof message === 'string') return message;
    }
  } catch {
    // Use the status-based fallback when the error body is not JSON.
  }

  return fallback;
};

const parseRecommendation = (data: unknown): RecommendationResponse => {
  if (!data || typeof data !== 'object') throw new Error('Recommendation response is malformed.');
  const response = data as Record<string, unknown>;
  const recommendation = response.recommendation as Record<string, unknown> | undefined;
  const modes = new Set(['drive', 'transit', 'walk']);

  if (
    !isFiniteNumber(response.aqi) ||
    !isFiniteNumber(response.pm2_5) ||
    !Array.isArray(response.routes) ||
    !recommendation ||
    !modes.has(String(recommendation.mode)) ||
    !isFiniteNumber(recommendation.travel_minutes) ||
    !isFiniteNumber(recommendation.distance_km) ||
    !isFiniteNumber(recommendation.risk_score) ||
    !isFiniteNumber(recommendation.recommendation_score) ||
    typeof recommendation.route !== 'string' ||
    typeof recommendation.reason !== 'string'
  ) {
    throw new Error('Recommendation response is missing required fields.');
  }

  const routes = response.routes.filter((route): route is RecommendedRoute => {
    if (!route || typeof route !== 'object') return false;
    const item = route as Record<string, unknown>;
    return modes.has(String(item.mode)) &&
      isFiniteNumber(item.distance_km) &&
      isFiniteNumber(item.duration_minutes) &&
      isFiniteNumber(item.recommendation_score) &&
      isFiniteNumber(item.risk_score);
  });

  if (!routes.length) throw new Error('Recommendation response contains no usable routes.');

  return {
    origin: typeof response.origin === 'string' ? response.origin : '',
    destination: typeof response.destination === 'string' ? response.destination : '',
    aqi: response.aqi,
    pm2_5: response.pm2_5,
    routes,
    recommendation: {
      mode: recommendation.mode as 'drive' | 'transit' | 'walk',
      route: recommendation.route,
      travel_minutes: recommendation.travel_minutes,
      distance_km: recommendation.distance_km,
      risk_score: recommendation.risk_score,
      recommendation_score: recommendation.recommendation_score,
      reason: recommendation.reason,
      suggested_departure: typeof recommendation.suggested_departure === 'string' ? recommendation.suggested_departure : undefined,
    },
    health_profile: response.health_profile as RecommendationResponse['health_profile'],
    departure_comparison: response.departure_comparison as RecommendationResponse['departure_comparison'],
    coach: response.coach as RecommendationResponse['coach'],
    disclaimer: typeof response.disclaimer === 'string' ? response.disclaimer : undefined,
  };
};

interface RoutesScreenProps {
  language: LanguageType;
  activeProfile: FamilyProfile;
  onHealthProfileChange: (profile: HealthProfile) => void;
  onShowToast: (msg: string, icon?: string) => void;
}

export const RoutesScreen: React.FC<RoutesScreenProps> = ({
  language,
  activeProfile,
  onHealthProfileChange,
  onShowToast,
}) => {
  const isEn = language === 'en';

  // Origin and destination location state
  const [origin, setOrigin] = useState<MapPlace>({
    address: 'Shivajinagar, Pune, Maharashtra, India',
    latitude: 18.5308,
    longitude: 73.8475,
  });

  const [destination, setDestination] = useState<MapPlace>({
    address: 'Hinjawadi, Pune, Maharashtra, India',
    latitude: 18.5913,
    longitude: 73.7389,
  });

  // Input text fields for autocomplete
  const [originText, setOriginText] = useState(origin.address);
  const [destinationText, setDestinationText] = useState(destination.address);

  // Suggestions state
  const [originSuggestions, setOriginSuggestions] = useState<MapPlace[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<MapPlace[]>([]);
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);

  // Geolocation & map marker selection
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [activeMarker, setActiveMarker] = useState<'origin' | 'destination'>('origin');

  // Air quality state (origin-driven)
  const [liveAQI, setLiveAQI] = useState<number | null>(null);
  const [aqiLoading, setAqiLoading] = useState<boolean>(true);
  const [aqiError, setAqiError] = useState<string | null>(null);
  const [aqiUpdatedAt, setAqiUpdatedAt] = useState<string | null>(null);
  const [aqiRefreshKey, setAqiRefreshKey] = useState(0);

  // Routes and recommendation state
  const [rawRoutes, setRawRoutes] = useState<RecommendedRoute[]>([]);
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [routeLoading, setRouteLoading] = useState<boolean>(true);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeRefreshKey, setRouteRefreshKey] = useState(0);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [hasUserSelectedRoute, setHasUserSelectedRoute] = useState(false);

  // Time & profile controls
  const [sliderMinutes, setSliderMinutes] = useState<number>(480);
  const departureHour = Math.floor(sliderMinutes / 60);
  const healthProfile: HealthProfile =
    activeProfile.healthProfile ?? (activeProfile.isAsthma ? 'asthma_sensitive' : 'general');

  // Request sequencing refs to prevent stale responses
  const routeRequestSeq = useRef(0);
  const searchOriginSeq = useRef(0);
  const searchDestSeq = useRef(0);

  // Container refs for click-outside suggestion dismissal
  const originContainerRef = useRef<HTMLDivElement>(null);
  const destContainerRef = useRef<HTMLDivElement>(null);

  // Close suggestion dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (originContainerRef.current && !originContainerRef.current.contains(event.target as Node)) {
        setShowOriginSuggestions(false);
      }
      if (destContainerRef.current && !destContainerRef.current.contains(event.target as Node)) {
        setShowDestSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch live city AQI using selected origin coordinates
  useEffect(() => {
    if (!origin || !isFiniteNumber(origin.latitude) || !isFiniteNumber(origin.longitude)) {
      setLiveAQI(null);
      setAqiError('Origin coordinates are not set.');
      setAqiLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchAQI = async () => {
      setAqiLoading(true);
      const requestController = new AbortController();
      const cancelRequest = () => requestController.abort();
      const timeoutId = window.setTimeout(cancelRequest, AQI_REQUEST_TIMEOUT_MS);
      controller.signal.addEventListener('abort', cancelRequest, { once: true });

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/air-quality?latitude=${origin.latitude}&longitude=${origin.longitude}`,
          { signal: requestController.signal }
        );

        if (!response.ok) throw new Error(await getAirQualityErrorMessage(response));

        const data = await response.json();
        const value = data?.current?.us_aqi;

        if (typeof value !== 'number' || !Number.isFinite(value)) {
          throw new Error('AQI data is unavailable for this location.');
        }

        if (controller.signal.aborted) return;
        setLiveAQI(value);
        setAqiError(null);
        setAqiUpdatedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Failed to fetch live AQI:', error);
        setLiveAQI(null);
        setAqiError(
          requestController.signal.aborted
            ? 'AQI request timed out. Please retry.'
            : (error instanceof Error ? error.message : 'Live AQI is unavailable.')
        );
      } finally {
        window.clearTimeout(timeoutId);
        controller.signal.removeEventListener('abort', cancelRequest);
        if (!controller.signal.aborted) setAqiLoading(false);
      }
    };

    void fetchAQI();

    const intervalId = window.setInterval(() => void fetchAQI(), 5 * 60 * 1000);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [origin?.latitude, origin?.longitude, aqiRefreshKey]);

  // Debounced search for Origin autocomplete
  useEffect(() => {
    const query = originText.trim();
    if (query.length < 2 || (origin && query === origin.address)) {
      setOriginSuggestions([]);
      setShowOriginSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      const currentSeq = ++searchOriginSeq.current;
      setIsSearchingOrigin(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/places/search?query=${encodeURIComponent(query)}`
        );
        if (!response.ok) throw new Error('Place search failed');
        const data = await response.json();
        if (currentSeq === searchOriginSeq.current) {
          setOriginSuggestions(data?.places ?? []);
          setShowOriginSuggestions(true);
        }
      } catch {
        if (currentSeq === searchOriginSeq.current) {
          setOriginSuggestions([]);
        }
      } finally {
        if (currentSeq === searchOriginSeq.current) {
          setIsSearchingOrigin(false);
        }
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [originText, origin?.address]);

  // Debounced search for Destination autocomplete
  useEffect(() => {
    const query = destinationText.trim();
    if (query.length < 2 || (destination && query === destination.address)) {
      setDestSuggestions([]);
      setShowDestSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      const currentSeq = ++searchDestSeq.current;
      setIsSearchingDest(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/places/search?query=${encodeURIComponent(query)}`
        );
        if (!response.ok) throw new Error('Place search failed');
        const data = await response.json();
        if (currentSeq === searchDestSeq.current) {
          setDestSuggestions(data?.places ?? []);
          setShowDestSuggestions(true);
        }
      } catch {
        if (currentSeq === searchDestSeq.current) {
          setDestSuggestions([]);
        }
      } finally {
        if (currentSeq === searchDestSeq.current) {
          setIsSearchingDest(false);
        }
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [destinationText, destination?.address]);

  // Fetch routes from GET /api/routes, then pass to POST /api/recommendation
  useEffect(() => {
    if (!origin || !destination) return;

    // Check if origin and destination are identical
    if (
      origin.address === destination.address &&
      Math.abs(origin.latitude - destination.latitude) < 0.0001 &&
      Math.abs(origin.longitude - destination.longitude) < 0.0001
    ) {
      setRouteError(isEn ? 'Origin and destination cannot be identical.' : 'सुरुवात आणि गंतव्य एकच असू शकत नाही.');
      setRouteLoading(false);
      setRecommendation(null);
      setRawRoutes([]);
      return;
    }

    const currentSeq = ++routeRequestSeq.current;
    const controller = new AbortController();

    const fetchRouteAndRecommendation = async () => {
      setRouteLoading(true);
      setRouteError(null);

      const requestController = new AbortController();
      const cancelRequest = () => requestController.abort();
      const timeoutId = window.setTimeout(cancelRequest, RECOMMENDATION_REQUEST_TIMEOUT_MS);
      controller.signal.addEventListener('abort', cancelRequest, { once: true });

      try {
        // Step 1: Send actual selected locations to GET /api/routes
        const routesParams = new URLSearchParams({
          origin: origin.address,
          destination: destination.address,
          origin_lat: origin.latitude.toString(),
          origin_lng: origin.longitude.toString(),
          dest_lat: destination.latitude.toString(),
          dest_lng: destination.longitude.toString(),
        });

        const routesResponse = await fetch(`${API_BASE_URL}/api/routes?${routesParams.toString()}`, {
          signal: requestController.signal,
        });

        if (!routesResponse.ok) {
          throw new Error(await getApiErrorMessage(routesResponse));
        }

        const routesData = await routesResponse.json();
        const computedRoutes: RecommendedRoute[] = routesData.routes ?? [];

        if (controller.signal.aborted || currentSeq !== routeRequestSeq.current) return;
        setRawRoutes(computedRoutes);

        // Step 2: Pass returned route data to POST /api/recommendation
        const recommendationResponse = await fetch(`${API_BASE_URL}/api/recommendation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            origin: origin.address,
            destination: destination.address,
            latitude: origin.latitude,
            longitude: origin.longitude,
            origin_latitude: origin.latitude,
            origin_longitude: origin.longitude,
            destination_latitude: destination.latitude,
            destination_longitude: destination.longitude,
            has_asthma: healthProfile === 'asthma_sensitive',
            health_profile: healthProfile,
            departure_hour: departureHour,
            routes: computedRoutes,
          }),
          signal: requestController.signal,
        });

        if (!recommendationResponse.ok) {
          throw new Error(await getApiErrorMessage(recommendationResponse));
        }

        const parsedRecommendation = parseRecommendation(await recommendationResponse.json());

        if (controller.signal.aborted || currentSeq !== routeRequestSeq.current) return;
        setRecommendation(parsedRecommendation);
        setRouteError(null);
      } catch (error) {
        if (controller.signal.aborted || currentSeq !== routeRequestSeq.current) return;
        console.error('Failed to calculate routes and recommendation:', error);
        setRecommendation(null);
        setRouteError(
          requestController.signal.aborted
            ? 'Route request timed out. Please retry.'
            : (error instanceof Error ? error.message : 'Unable to calculate routes between selected locations.')
        );
      } finally {
        window.clearTimeout(timeoutId);
        controller.signal.removeEventListener('abort', cancelRequest);
        if (!controller.signal.aborted && currentSeq === routeRequestSeq.current) {
          setRouteLoading(false);
        }
      }
    };

    void fetchRouteAndRecommendation();

    return () => {
      controller.abort();
    };
  }, [
    origin?.latitude,
    origin?.longitude,
    origin?.address,
    destination?.latitude,
    destination?.longitude,
    destination?.address,
    departureHour,
    healthProfile,
    routeRefreshKey,
    isEn,
  ]);

  // Sync selectedRouteId to recommended mode if user hasn't explicitly overridden it
  useEffect(() => {
    if (!hasUserSelectedRoute && recommendation) {
      setSelectedRouteId(routeIdForRecommendedMode(recommendation.recommendation.mode));
    }
  }, [hasUserSelectedRoute, recommendation]);

  // Handlers for place selection and user actions
  const handleSelectOriginSuggestion = (place: MapPlace) => {
    setOrigin(place);
    setOriginText(place.address);
    setShowOriginSuggestions(false);
    setGeoError(null);
    onShowToast(
      isEn ? `Origin set: ${place.address}` : `सुरुवात ठिकाण: ${place.address}`,
      'place'
    );
  };

  const handleSelectDestSuggestion = (place: MapPlace) => {
    setDestination(place);
    setDestinationText(place.address);
    setShowDestSuggestions(false);
    onShowToast(
      isEn ? `Destination set: ${place.address}` : `गंतव्य स्थान: ${place.address}`,
      'place'
    );
  };

  const handleSwapLocations = () => {
    const prevOrigin = origin;
    const prevDest = destination;
    setOrigin(prevDest);
    setDestination(prevOrigin);
    setOriginText(prevDest.address);
    setDestinationText(prevOrigin.address);
    setShowOriginSuggestions(false);
    setShowDestSuggestions(false);
    setHasUserSelectedRoute(false);
    onShowToast(
      isEn ? 'Swapped origin and destination' : 'सुरुवात आणि गंतव्य बदलले',
      'swap_vert'
    );
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      const msg = isEn ? 'Geolocation is not supported by your browser.' : 'ब्राउझर भौगोलिक स्थान समर्थन करत नाही.';
      setGeoError(msg);
      onShowToast(msg, 'warning');
      return;
    }

    setIsLocatingUser(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `${API_BASE_URL}/api/places/reverse?latitude=${latitude}&longitude=${longitude}`
          );
          let address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          let placeId: string | null = null;

          if (res.ok) {
            const data = await res.json();
            if (data?.place?.address) {
              address = data.place.address;
              placeId = data.place.place_id ?? null;
            }
          }

          const resolvedPlace: MapPlace = {
            address,
            latitude,
            longitude,
            place_id: placeId,
          };

          setOrigin(resolvedPlace);
          setOriginText(address);
          setShowOriginSuggestions(false);
          setGeoError(null);
          onShowToast(
            isEn ? `Origin set to your current location (${address})` : `आपले वर्तमान स्थान सेट केले (${address})`,
            'my_location'
          );
        } catch (err) {
          console.error('Reverse geocode error:', err);
          const fallbackPlace: MapPlace = {
            address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            latitude,
            longitude,
          };
          setOrigin(fallbackPlace);
          setOriginText(fallbackPlace.address);
        } finally {
          setIsLocatingUser(false);
        }
      },
      (err) => {
        setIsLocatingUser(false);
        let msg = isEn ? 'Failed to retrieve your location.' : 'स्थान मिळवण्यात अयशस्वी.';
        if (err.code === 1) {
          msg = isEn
            ? 'Location access was denied. You can search for an address or click on the map.'
            : 'स्थान परवानगी नाकारली गेली. आपण शोधू शकता किंवा नकाशावर निवडू शकता.';
        } else if (err.code === 2) {
          msg = isEn ? 'Location unavailable. Please search for an address.' : 'स्थान उपलब्ध नाही.';
        } else if (err.code === 3) {
          msg = isEn ? 'Location request timed out.' : 'स्थान विनंती कालबाह्य झाली.';
        }
        setGeoError(msg);
        onShowToast(msg, 'warning');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const handleMapPointSelect = async (type: 'origin' | 'destination', lat: number, lng: number) => {
    setIsResolvingLocation(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/places/reverse?latitude=${lat}&longitude=${lng}`
      );
      let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      let placeId: string | null = null;

      if (res.ok) {
        const data = await res.json();
        if (data?.place?.address) {
          address = data.place.address;
          placeId = data.place.place_id ?? null;
        }
      }

      const newPlace: MapPlace = {
        address,
        latitude: lat,
        longitude: lng,
        place_id: placeId,
      };

      if (type === 'origin') {
        setOrigin(newPlace);
        setOriginText(address);
        setShowOriginSuggestions(false);
        setActiveMarker('destination');
        onShowToast(
          isEn ? `Origin placed on map: ${address}` : `नकाशावर सुरुवात: ${address}`,
          'place'
        );
      } else {
        setDestination(newPlace);
        setDestinationText(address);
        setShowDestSuggestions(false);
        onShowToast(
          isEn ? `Destination placed on map: ${address}` : `नकाशावर गंतव्य: ${address}`,
          'place'
        );
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
      const fallbackPlace: MapPlace = {
        address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        latitude: lat,
        longitude: lng,
      };
      if (type === 'origin') {
        setOrigin(fallbackPlace);
        setOriginText(fallbackPlace.address);
        setActiveMarker('destination');
      } else {
        setDestination(fallbackPlace);
        setDestinationText(fallbackPlace.address);
      }
    } finally {
      setIsResolvingLocation(false);
    }
  };

  const getAQIStatus = (aqi: number): string => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };

  const formatTime = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  };

  // Derive route options from backend data
  const cityAqi = liveAQI ?? recommendation?.aqi ?? null;
  const lowestRiskScore = recommendation
    ? Math.min(...recommendation.routes.map((route) => route.risk_score))
    : null;

  const baseRoutes: RouteWithExposure[] = INITIAL_TRANSIT_MODES.map((mode) => {
    const backendMode =
      mode.id === 'transit-car' ? 'drive' :
      mode.id === 'transit-metro' ? 'transit' :
      null;

    const backendRoute = recommendation?.routes.find((route) => route.mode === backendMode);
    const isRecommended = backendMode !== null && recommendation?.recommendation.mode === backendMode;
    const unavailable = backendMode === null || !backendRoute;

    // Never label generic public transit as confirmed metro service
    const name = mode.id === 'transit-metro'
      ? 'Public Transit (Google Routes)'
      : mode.id === 'transit-bus'
        ? 'PMPML Bus (unavailable)'
        : mode.name;

    return {
      ...mode,
      name,
      via: unavailable
        ? (backendMode === null ? 'Bus-only route data is not available' : 'Live route data is not available')
        : (isRecommended ? recommendation.recommendation.reason : 'Live route data from Google Routes'),
      duration: backendRoute ? `${backendRoute.duration_minutes} min` : 'Unavailable',
      aqi: cityAqi,
      aqiStatus: cityAqi === null ? 'Unavailable' : getAQIStatus(cityAqi),
      badge: isRecommended ? 'RECOMMENDED' : undefined,
      highlight: isRecommended,
      ecoBenefit: unavailable
        ? 'Bus-only distance and duration are unavailable.'
        : `Estimated risk ${backendRoute.risk_score}/100 · recommendation ${backendRoute.recommendation_score}/100`,
      riskScore: backendRoute?.risk_score ?? null,
      recommendationScore: backendRoute?.recommendation_score ?? null,
      isRecommended,
      isLowestExposure: backendRoute ? backendRoute.risk_score === lowestRiskScore : false,
      distanceKm: backendRoute?.distance_km ?? null,
      durationIsLive: Boolean(backendRoute),
      unavailable,
      encodedPolyline: backendRoute?.encoded_polyline,
    };
  });

  const walkingRoute = recommendation?.routes.find((route) => route.mode === 'walk');
  const routes: RouteWithExposure[] = [
    ...baseRoutes,
    ...(walkingRoute ? [{
      id: 'transit-walk',
      name: 'Walking',
      via: recommendation?.recommendation.mode === 'walk'
        ? recommendation.recommendation.reason
        : 'Live pedestrian path from Google Routes',
      duration: `${walkingRoute.duration_minutes} min`,
      aqi: cityAqi,
      aqiStatus: cityAqi === null ? 'Unavailable' : getAQIStatus(cityAqi),
      badge: recommendation?.recommendation.mode === 'walk' ? 'RECOMMENDED' : undefined,
      highlight: recommendation?.recommendation.mode === 'walk',
      ecoBenefit: `Estimated risk ${walkingRoute.risk_score}/100 · recommendation ${walkingRoute.recommendation_score}/100`,
      icon: 'directions_walk',
      riskScore: walkingRoute.risk_score,
      recommendationScore: walkingRoute.recommendation_score,
      isRecommended: recommendation?.recommendation.mode === 'walk',
      isLowestExposure: walkingRoute.risk_score === lowestRiskScore,
      distanceKm: walkingRoute.distance_km,
      durationIsLive: true,
      unavailable: false,
      encodedPolyline: walkingRoute.encoded_polyline,
    }] : []),
  ];

  const handleSelectRoute = (route: RouteWithExposure) => {
    setSelectedRouteId(route.id);
    setHasUserSelectedRoute(true);
    onShowToast(
      isEn
        ? `Selected ${route.name} (${route.duration}, ${route.aqi === null ? 'AQI unavailable' : `AQI ${route.aqi}`})`
        : `${route.name} निवडला (${route.duration}, AQI ${route.aqi ?? '--'})`,
      'navigation'
    );
  };

  // Determine which polyline to render on the interactive map
  const activeSelectedRoute = routes.find((r) => r.id === selectedRouteId && !r.unavailable);
  const recommendedRouteItem = routes.find((r) => r.isRecommended);
  const currentActiveRoute = activeSelectedRoute ?? recommendedRouteItem ?? routes.find((r) => !r.unavailable);

  // Active polyline fallback: from active route item or from raw routes
  const activePolyline = currentActiveRoute?.encodedPolyline
    ?? rawRoutes.find((r) => routeIdForRecommendedMode(r.mode) === selectedRouteId)?.encoded_polyline
    ?? rawRoutes.find((r) => r.encoded_polyline)?.encoded_polyline;

  return (
    <div className="flex flex-col w-full pb-28 pt-6 px-4 md:pb-10 md:pt-8 md:px-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-[#191c1e] tracking-tight">
          {isEn ? 'Clean Air Route Planner' : 'स्वच्छ हवा मार्ग नियोजक'}
        </h1>
        <p className="text-xs sm:text-sm text-[#3e4850] mt-0.5">
          {isEn
            ? 'Compare live travel times and estimated exposure index across transit modes.'
            : 'प्रवासाची वेळ आणि अंदाजे प्रदूषण संपर्काची तुलना करा.'}
        </p>
      </div>

      {/* Editable Origin & Destination Planner Card */}
      <section
        className="mb-4 rounded-2xl border border-[#e0e3e5]/70 bg-white p-4 shadow-sm"
        aria-label="Route location planner"
      >
        <div className="flex flex-col gap-3">
          {/* Origin Input Row */}
          <div className="relative" ref={originContainerRef}>
            <label className="text-[11px] font-semibold text-[#006591] flex items-center justify-between mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#006591] inline-block ring-2 ring-[#c9e6ff]" />
                {isEn ? 'Origin (Starting point)' : 'सुरुवात (प्रस्थान बिंदू)'}
              </span>
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={isLocatingUser}
                className="text-[11px] font-semibold text-[#006591] hover:text-[#004c6e] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Use current GPS location"
              >
                <span className={`material-symbols-outlined text-[15px] ${isLocatingUser ? 'animate-spin' : ''}`}>
                  {isLocatingUser ? 'refresh' : 'my_location'}
                </span>
                <span>{isLocatingUser ? (isEn ? 'Locating...' : 'शोधत आहे...') : (isEn ? 'Use my location' : 'माझे स्थान वापरा')}</span>
              </button>
            </label>

            <div className="relative flex items-center">
              <span className="absolute left-3 material-symbols-outlined text-[#6e7881] text-[18px]">
                trip_origin
              </span>
              <input
                type="text"
                value={originText}
                onChange={(e) => {
                  setOriginText(e.target.value);
                  setGeoError(null);
                }}
                onFocus={() => {
                  if (originSuggestions.length > 0) setShowOriginSuggestions(true);
                }}
                placeholder={isEn ? 'Search origin address, place, or click map...' : 'सुरुवातीचा पत्ता शोधा किंवा नकाशावर क्लिक करा...'}
                className="w-full rounded-xl border border-[#e0e3e5] bg-[#f7f9fb] py-2.5 pl-9 pr-8 text-xs font-medium text-[#191c1e] placeholder-[#6e7881] focus:border-[#006591] focus:bg-white focus:outline-none transition-colors"
                aria-label="Origin address"
              />
              {originText && (
                <button
                  type="button"
                  onClick={() => {
                    setOriginText('');
                    setShowOriginSuggestions(false);
                  }}
                  className="absolute right-2.5 text-[#6e7881] hover:text-[#191c1e] cursor-pointer"
                  title="Clear origin"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {/* Origin Autocomplete Dropdown */}
            {showOriginSuggestions && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border border-[#e0e3e5] bg-white p-1 shadow-lg max-h-56 overflow-y-auto text-xs animate-in fade-in">
                {isSearchingOrigin && (
                  <div className="px-3 py-2 text-xs text-[#6e7881] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                    <span>{isEn ? 'Searching places...' : 'ठिकाणे शोधत आहे...'}</span>
                  </div>
                )}
                {!isSearchingOrigin && originSuggestions.length === 0 && (
                  <div className="px-3 py-2 text-xs text-[#6e7881]">
                    {isEn ? 'No places found. Press enter or pick on the map.' : 'ठिकाण सापडले नाही.'}
                  </div>
                )}
                {originSuggestions.map((place, idx) => (
                  <button
                    key={place.place_id ?? `origin-sug-${idx}`}
                    type="button"
                    onClick={() => handleSelectOriginSuggestion(place)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#c9e6ff]/30 text-[#191c1e] flex items-start gap-2 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[#006591] text-[16px] mt-0.5 shrink-0">place</span>
                    <span className="line-clamp-2">{place.address}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Middle Control Bar: Swap Button and Map Click Selector */}
          <div className="flex items-center justify-between py-0.5 border-y border-[#eceef0]">
            <button
              type="button"
              onClick={handleSwapLocations}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#006591] bg-[#c9e6ff]/40 hover:bg-[#c9e6ff]/70 transition-colors cursor-pointer"
              title="Swap origin and destination"
              aria-label="Swap origin and destination"
            >
              <span className="material-symbols-outlined text-[16px]">swap_vert</span>
              <span>{isEn ? 'Swap Locations' : 'ठिकाणे बदला'}</span>
            </button>

            <div className="flex items-center gap-1 text-[11px] text-[#6e7881]">
              <span className="hidden sm:inline">{isEn ? 'Clicking map sets:' : 'नकाशावर सेट करा:'}</span>
              <button
                type="button"
                onClick={() => setActiveMarker('origin')}
                className={`px-2 py-0.5 rounded-md font-semibold text-[11px] cursor-pointer transition-colors ${
                  activeMarker === 'origin'
                    ? 'bg-[#006591] text-white shadow-xs'
                    : 'bg-[#eceef0] text-[#3e4850] hover:bg-[#e0e3e5]'
                }`}
              >
                ● {isEn ? 'Origin' : 'सुरुवात'}
              </button>
              <button
                type="button"
                onClick={() => setActiveMarker('destination')}
                className={`px-2 py-0.5 rounded-md font-semibold text-[11px] cursor-pointer transition-colors ${
                  activeMarker === 'destination'
                    ? 'bg-[#006b5f] text-white shadow-xs'
                    : 'bg-[#eceef0] text-[#3e4850] hover:bg-[#e0e3e5]'
                }`}
              >
                ● {isEn ? 'Destination' : 'गंतव्य'}
              </button>
            </div>
          </div>

          {/* Destination Input Row */}
          <div className="relative" ref={destContainerRef}>
            <label className="text-[11px] font-semibold text-[#006b5f] flex items-center justify-between mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#006b5f] inline-block ring-2 ring-[#71f8e4]" />
                {isEn ? 'Destination (Arrival point)' : 'गंतव्य (आगमन बिंदू)'}
              </span>
            </label>

            <div className="relative flex items-center">
              <span className="absolute left-3 material-symbols-outlined text-[#6e7881] text-[18px]">
                location_on
              </span>
              <input
                type="text"
                value={destinationText}
                onChange={(e) => {
                  setDestinationText(e.target.value);
                  setGeoError(null);
                }}
                onFocus={() => {
                  if (destSuggestions.length > 0) setShowDestSuggestions(true);
                }}
                placeholder={isEn ? 'Search destination address, place, or click map...' : 'गंतव्य पत्ता शोधा किंवा नकाशावर क्लिक करा...'}
                className="w-full rounded-xl border border-[#e0e3e5] bg-[#f7f9fb] py-2.5 pl-9 pr-8 text-xs font-medium text-[#191c1e] placeholder-[#6e7881] focus:border-[#006b5f] focus:bg-white focus:outline-none transition-colors"
                aria-label="Destination address"
              />
              {destinationText && (
                <button
                  type="button"
                  onClick={() => {
                    setDestinationText('');
                    setShowDestSuggestions(false);
                  }}
                  className="absolute right-2.5 text-[#6e7881] hover:text-[#191c1e] cursor-pointer"
                  title="Clear destination"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {/* Destination Autocomplete Dropdown */}
            {showDestSuggestions && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border border-[#e0e3e5] bg-white p-1 shadow-lg max-h-56 overflow-y-auto text-xs animate-in fade-in">
                {isSearchingDest && (
                  <div className="px-3 py-2 text-xs text-[#6e7881] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                    <span>{isEn ? 'Searching places...' : 'ठिकाणे शोधत आहे...'}</span>
                  </div>
                )}
                {!isSearchingDest && destSuggestions.length === 0 && (
                  <div className="px-3 py-2 text-xs text-[#6e7881]">
                    {isEn ? 'No places found. Press enter or pick on the map.' : 'ठिकाण सापडले नाही.'}
                  </div>
                )}
                {destSuggestions.map((place, idx) => (
                  <button
                    key={place.place_id ?? `dest-sug-${idx}`}
                    type="button"
                    onClick={() => handleSelectDestSuggestion(place)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#71f8e4]/30 text-[#191c1e] flex items-start gap-2 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[#006b5f] text-[16px] mt-0.5 shrink-0">place</span>
                    <span className="line-clamp-2">{place.address}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Validation & Geolocation Alert Message */}
          {geoError && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-amber-600">info</span>
                <span>{geoError}</span>
              </div>
              <button
                type="button"
                onClick={() => setGeoError(null)}
                className="text-amber-700 font-semibold text-[11px] hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Interactive Map Card */}
      <section
        className="relative w-full h-[380px] sm:h-[440px] rounded-2xl overflow-hidden shadow-md mb-4 border border-[#e0e3e5]/70"
        aria-label="Interactive route map container"
      >
        <RouteMap
          origin={origin}
          destination={destination}
          encodedPolyline={activePolyline}
          activeMarker={activeMarker}
          onSetActiveMarker={setActiveMarker}
          onMapClick={(lat, lng) => handleMapPointSelect(activeMarker, lat, lng)}
          onMarkerDrag={(type, lat, lng) => handleMapPointSelect(type, lat, lng)}
          isLoadingRoute={routeLoading}
          isResolvingLocation={isResolvingLocation}
          routeUnavailableMessage={routeError}
        />
      </section>

      {/* Selected Route Summary Banner */}
      {currentActiveRoute && !currentActiveRoute.unavailable && (
        <section
          className="mb-4 rounded-2xl border border-[#006591]/30 bg-gradient-to-r from-[#c9e6ff]/40 to-white p-4 shadow-sm"
          aria-label="Selected route overview"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#006591] text-white flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[22px]">{currentActiveRoute.icon}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-[#191c1e]">{currentActiveRoute.name}</h2>
                  <span className="rounded-full bg-[#006591] px-2 py-0.5 text-[10px] font-bold text-white tracking-wide">
                    ACTIVE ROUTE
                  </span>
                  {currentActiveRoute.isRecommended && (
                    <span className="rounded-full bg-[#006b5f] px-2 py-0.5 text-[10px] font-bold text-white tracking-wide">
                      RECOMMENDED
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#3e4850] mt-0.5">
                  {currentActiveRoute.via}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <span className="text-sm font-bold text-[#191c1e] tabular-nums block">
                  {currentActiveRoute.duration}
                  {currentActiveRoute.distanceKm !== null && ` · ${currentActiveRoute.distanceKm.toFixed(2)} km`}
                </span>
                <span className="text-[11px] font-semibold text-[#006591] block tabular-nums">
                  City AQI {cityAqi ?? '--'} · Risk {currentActiveRoute.riskScore ?? '--'}/100
                </span>
              </div>
              {!currentActiveRoute.isRecommended && recommendedRouteItem && (
                <button
                  type="button"
                  onClick={() => handleSelectRoute(recommendedRouteItem)}
                  className="rounded-xl border border-[#006591] bg-white px-3 py-1.5 text-xs font-semibold text-[#006591] hover:bg-[#c9e6ff]/30 transition-colors shadow-2xs"
                >
                  {isEn ? 'Switch to Recommended' : 'शिफारस केलेल्यावर जा'}
                </button>
              )}
            </div>
          </div>
          <p className="mt-2 text-[10px] text-[#6e7881] border-t border-[#006591]/15 pt-1.5">
            {isEn
              ? 'Exposure index is an estimate calculated from city-level AQI, route travel duration, and mode factors. It is not measured route pollution.'
              : 'एक्सपोजर इंडेक्स हा अंदाज आहे; हे मोजलेले वैयक्तिक प्रदूषण नाही.'}
          </p>
        </section>
      )}

      {/* Travel Health Profile Selection */}
      <section className="mb-4 rounded-2xl border border-[#e0e3e5]/60 bg-white p-4 shadow-sm" aria-labelledby="health-profile-heading">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 id="health-profile-heading" className="text-xs font-semibold text-[#191c1e]">
              {isEn ? 'Travel profile' : 'प्रवास प्रोफाइल'}
            </h3>
            <p className="mt-0.5 text-[11px] text-[#3e4850]">
              {isEn ? `Recommendations for ${activeProfile.name} prioritize estimated exposure and time differently.` : 'शिफारस प्रवासाची वेळ आणि अंदाजे एक्सपोजर वापरते.'}
            </p>
          </div>
          <span className="material-symbols-outlined text-[#006591] text-[20px]">person</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Travel health profile">
          {([
            ['general', 'General'],
            ['asthma_sensitive', 'Asthma-sensitive'],
            ['outdoor_worker', 'Outdoor worker'],
            ['pollution_sensitive', 'Pollution-sensitive'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onHealthProfileChange(id)}
              aria-pressed={healthProfile === id}
              className={`rounded-xl border px-2 py-2 text-[11px] font-semibold transition-colors cursor-pointer ${
                healthProfile === id
                  ? 'border-[#006591] bg-[#c9e6ff]/50 text-[#004c6e]'
                  : 'border-[#e0e3e5] text-[#3e4850] hover:bg-[#f2f4f6]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-[#6e7881]">
          {isEn ? 'This changes ranking preferences only; it is not medical advice.' : 'हे फक्त क्रमवारीची प्राधान्ये बदलते; हा वैद्यकीय सल्ला नाही.'}
        </p>
      </section>

      {/* Departure Time Slider Control Card */}
      <section className="bg-white rounded-2xl p-4 shadow-sm mb-4 border border-[#e0e3e5]/60" aria-label="Departure time selector">
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-xs font-semibold text-[#191c1e] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#006591] text-[18px]">schedule</span>
            {isEn ? 'Departure Time' : 'प्रस्थानाची वेळ'}
          </span>
          <span className="text-xs font-bold text-[#006591] bg-[#c9e6ff]/40 px-3 py-1 rounded-full tabular-nums">
            {formatTime(sliderMinutes)}
          </span>
        </div>
        <input
          type="range"
          min="300"
          max="1320"
          step="15"
          value={sliderMinutes}
          onChange={(e) => setSliderMinutes(parseInt(e.target.value))}
          className="w-full accent-[#006591] h-2 bg-[#eceef0] rounded-lg cursor-pointer"
          aria-label="Departure time slider"
        />
        <div className="flex justify-between text-[11px] text-[#6e7881] mt-2 font-medium">
          <span>5:00 AM</span>
          <span>12:00 PM</span>
          <span>10:00 PM</span>
        </div>
      </section>

      {/* Hourly Forecast Departure Time Comparison */}
      <section className="mb-4 rounded-2xl border border-[#e0e3e5]/60 bg-white p-4 shadow-sm" aria-labelledby="time-comparison-heading">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 id="time-comparison-heading" className="text-xs font-semibold text-[#191c1e]">
            {isEn ? 'Best time to travel' : 'प्रवासासाठी उत्तम वेळ'}
          </h3>
          <span className="text-[10px] text-[#6e7881]">Open-Meteo hourly forecast</span>
        </div>
        {recommendation?.departure_comparison?.available && recommendation.departure_comparison.selected ? (
          <>
            <p className="text-xs text-[#3e4850]">
              {isEn ? `Selected ${formatTime(recommendation.departure_comparison.selected.departure_hour * 60)}: AQI ${recommendation.departure_comparison.selected.aqi}, estimated exposure index ${recommendation.departure_comparison.selected.estimated_exposure_index}.` : 'निवडलेली वेळ आणि अंदाजे एक्सपोजर Open-Meteo तासाच्या अंदाजावर आधारित आहे.'}
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[recommendation.departure_comparison.selected, ...(recommendation.departure_comparison.alternatives ?? [])].map((option) => (
                <div key={option.time} className={`rounded-xl border p-2 text-[11px] ${option.departure_hour === departureHour ? 'border-[#006591] bg-[#c9e6ff]/30' : 'border-[#e0e3e5]'}`}>
                  <p className="font-semibold text-[#191c1e]">{formatTime(option.departure_hour * 60)}</p>
                  <p className="text-[#3e4850]">AQI {option.aqi} · Index {option.estimated_exposure_index}</p>
                </div>
              ))}
            </div>
            {recommendation.departure_comparison.recommend_different_time && recommendation.departure_comparison.best_available && (
              <p className="mt-3 rounded-xl bg-[#6df5e1]/25 p-2 text-[11px] text-[#006f64]">
                {isEn ? `A ${formatTime(recommendation.departure_comparison.best_available.departure_hour * 60)} departure has the lowest estimated exposure among the forecast times.` : 'दर्शविलेल्या वेळांमध्ये पर्यायी वेळ सर्वात कमी अंदाजे एक्सपोजर दाखवते.'}
              </p>
            )}
            <p className="mt-2 text-[10px] text-[#6e7881]">{recommendation.departure_comparison.assumption}</p>
          </>
        ) : (
          <p className="text-xs text-[#6e7881]">{recommendation?.departure_comparison?.message ?? (isEn ? 'Hourly AQI forecast is loaded with the route recommendation.' : 'तासाचा AQI अंदाज उपलब्ध नाही.')}</p>
        )}
      </section>

      {/* Loading & Status Alerts */}
      {aqiLoading && (
        <p className="mb-3 text-sm text-gray-500">{isEn ? 'Loading live air quality for origin...' : 'हवेची गुणवत्ता लोड होत आहे...'}</p>
      )}

      {aqiError && (
        <div className="mb-3 flex items-center justify-between gap-3 text-sm text-red-600 rounded-xl bg-red-50 p-3 border border-red-200">
          <span>{isEn ? `Live origin AQI is unavailable: ${aqiError} No sample AQI is shown.` : 'हवेची गुणवत्ता उपलब्ध नाही.'}</span>
          <button
            type="button"
            onClick={() => setAqiRefreshKey((value) => value + 1)}
            className="shrink-0 rounded-full border border-red-300 px-3 py-1 text-xs font-semibold hover:bg-red-100 transition-colors"
          >
            {isEn ? 'Retry' : 'पुन्हा प्रयत्न करा'}
          </button>
        </div>
      )}

      {routeLoading && (
        <p className="mb-3 text-sm text-gray-500">
          {isEn ? 'Loading Google Maps route distances and durations...' : 'Google Maps मार्ग अंतर आणि वेळ लोड होत आहे...'}
        </p>
      )}

      {routeError && (
        <div className="mb-3 flex items-center justify-between gap-3 text-sm text-amber-800 rounded-xl bg-amber-50 p-3 border border-amber-200">
          <span>{isEn ? `Route recommendation is unavailable (${routeError}).` : 'Route recommendation is unavailable.'}</span>
          <button
            type="button"
            onClick={() => setRouteRefreshKey((value) => value + 1)}
            className="shrink-0 rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold hover:bg-amber-100 transition-colors"
          >
            {isEn ? 'Retry' : 'पुन्हा प्रयत्न करा'}
          </button>
        </div>
      )}

      <div className="mb-3 rounded-xl border border-[#e0e3e5] bg-white px-3 py-2 text-xs text-[#3e4850]">
        {isEn
          ? `City-level AQI is supplied by Open-Meteo for origin coordinates${aqiUpdatedAt ? `, updated ${aqiUpdatedAt}` : ''}${recommendation ? `. PM2.5: ${recommendation.pm2_5} µg/m³` : ''}. Route risk and recommendation scores are estimates; they are not route-specific pollution measurements. PMPML bus-only data is unavailable.`
          : 'City-level AQI and route guidance are shown when live data is available. Route scores are estimates, not direct pollution measurements.'}
      </div>

      {/* Explainable Travel Coach */}
      {recommendation?.coach && (
        <section className="mb-4 rounded-2xl border border-[#006591]/20 bg-[#c9e6ff]/20 p-4" aria-labelledby="coach-heading">
          <div className="mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#006591] text-[19px]">tips_and_updates</span>
            <h3 id="coach-heading" className="text-xs font-bold text-[#191c1e]">{isEn ? 'Explainable travel coach' : 'प्रवास मार्गदर्शक'}</h3>
          </div>
          <p className="text-xs leading-relaxed text-[#3e4850]"><strong className="text-[#191c1e]">{isEn ? 'Why this route: ' : 'हा मार्ग का: '}</strong>{recommendation.coach.why_selected}</p>
          <p className="mt-2 text-xs leading-relaxed text-[#3e4850]"><strong className="text-[#191c1e]">{isEn ? 'Trade-off: ' : 'तडजोड: '}</strong>{recommendation.coach.tradeoff}</p>
          {recommendation.coach.alternative && (
            <p className="mt-2 text-xs text-[#3e4850]">{isEn ? `Alternative: ${recommendation.coach.alternative.route} is available (${recommendation.coach.alternative.travel_minutes} min; score ${recommendation.coach.alternative.recommendation_score}/100).` : 'एक पर्यायी मार्ग उपलब्ध आहे.'}</p>
          )}
          <details className="mt-3 text-[11px] text-[#3e4850]">
            <summary className="cursor-pointer font-semibold text-[#006591]">{isEn ? 'Data and limitations' : 'डेटा आणि मर्यादा'}</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {recommendation.coach.data_support.map((item) => <li key={item}>{item}</li>)}
              {recommendation.coach.limitations.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </details>
        </section>
      )}

      {/* Recommended Transit Modes Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-[#191c1e]">
            {isEn ? 'Transit Modes & Exposure Rankings' : 'प्रवास पर्याय आणि एक्सपोजर क्रमवारी'}
          </h3>
          <span className="text-[11px] text-[#6e7881]">
            {isEn ? 'Ranked by backend recommendation' : 'कमीतकमी श्वास धोक्यानुसार'}
          </span>
        </div>

        {routes.map((route) => {
          const isSelected = selectedRouteId === route.id;
          const isHighlight = route.highlight;

          return (
            <div
              key={route.id}
              className={`rounded-2xl p-4 transition-all relative overflow-hidden border ${
                isHighlight
                  ? 'bg-[#c9e6ff]/30 border-[#006591]/40 shadow-sm'
                  : 'bg-white border-[#e0e3e5]/60 hover:shadow-xs'
              } ${isSelected ? 'ring-2 ring-[#006591]' : ''}`}
            >
              {route.badge && (
                <div className="absolute top-0 right-0 bg-[#006591] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl tracking-wider">
                  {route.badge}
                </div>
              )}

              {route.isLowestExposure && (
                <div className="absolute top-0 left-0 bg-[#006b5f] text-white text-[10px] font-bold px-3 py-1 rounded-br-xl tracking-wider">
                  {isEn ? 'LOWEST ESTIMATED EXPOSURE' : 'कमी अंदाजे एक्सपोजर'}
                </div>
              )}

              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isHighlight
                        ? 'bg-[#006591] text-white shadow-xs'
                        : 'bg-[#eceef0] text-[#3e4850]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{route.icon}</span>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-[#191c1e]">{route.name}</h4>
                    <span className="text-xs text-[#3e4850]">{route.via}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-[#191c1e] tabular-nums">
                    {route.duration}
                    {route.unavailable && (
                      <span className="ml-1 text-[10px] font-medium text-[#6e7881]">
                        {isEn ? '(no live data)' : '(unavailable)'}
                      </span>
                    )}
                    {route.distanceKm !== null && (
                      <div className="text-[11px] font-medium text-[#3e4850]">
                        {route.distanceKm.toFixed(2)} km
                      </div>
                    )}
                  </div>

                  <div
                    className={`text-xs font-semibold tabular-nums ${
                      route.aqiStatus === 'Good'
                        ? 'text-[#006591]'
                        : route.aqiStatus === 'Moderate'
                          ? 'text-[#f59e0b]'
                          : 'text-[#ba1a1a]'
                    }`}
                  >
                    City AQI {route.aqi ?? '--'} ({route.aqiStatus}) · Risk {route.riskScore ?? '--'}/100 · Rec. {route.recommendationScore ?? '--'}/100
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#eceef0]/80 text-xs text-[#3e4850]">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-[#006b5f]">
                    {isHighlight ? 'eco' : 'warning'}
                  </span>
                  <span>{route.ecoBenefit}</span>
                </span>

                <button
                  type="button"
                  onClick={() => !route.unavailable && handleSelectRoute(route)}
                  disabled={route.unavailable}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isSelected
                      ? 'bg-[#006591] text-white shadow-xs'
                      : isHighlight
                        ? 'bg-[#006591] text-white hover:opacity-90'
                        : 'bg-[#eceef0] text-[#191c1e] hover:bg-[#e0e3e5]'
                  }`}
                >
                  {isSelected
                    ? isEn
                      ? 'Active Route ✓'
                      : 'निवडलेला मार्ग ✓'
                    : isEn
                      ? 'Select Route'
                      : 'मार्ग निवडा'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
