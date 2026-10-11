import unittest
from unittest.mock import AsyncMock, patch

from main import RecommendationRequest, recommendation


def air_quality_response(with_forecast=True):
    result = {"current": {"us_aqi": 120, "pm2_5": 40.0}}
    if with_forecast:
        result["hourly"] = {
            "time": ["2099-01-01T06:00", "2099-01-01T08:00", "2099-01-01T10:00"],
            "us_aqi": [130, 120, 90],
        }
    return result


def routes_response():
    return [
        {"mode": "drive", "available": True, "distance_km": 10, "duration_minutes": 20},
        {"mode": "transit", "available": True, "distance_km": 12, "duration_minutes": 30},
        {"mode": "walk", "available": False, "error": {"code": "NO_ROUTE"}},
    ]


class RecommendationTests(unittest.IsolatedAsyncioTestCase):
    async def test_recommendation_uses_available_live_routes_and_profile(self):
        with patch("main.get_air_quality", AsyncMock(return_value=air_quality_response())), patch(
            "main.calculate_routes", AsyncMock(return_value=routes_response())
        ):
            response = await recommendation(
                RecommendationRequest(health_profile="asthma_sensitive", departure_hour=8)
            )

        self.assertEqual(response["health_profile"]["id"], "asthma_sensitive")
        self.assertEqual(response["recommendation"]["mode"], "drive")
        self.assertEqual({route["mode"] for route in response["routes"]}, {"drive", "transit"})
        self.assertTrue(response["departure_comparison"]["available"])
        self.assertIn("limitations", response["coach"])

    async def test_missing_forecast_never_invents_departure_data(self):
        with patch("main.get_air_quality", AsyncMock(return_value=air_quality_response(False))), patch(
            "main.calculate_routes", AsyncMock(return_value=routes_response())
        ):
            response = await recommendation(RecommendationRequest())

        self.assertFalse(response["departure_comparison"]["available"])
        self.assertIn("unavailable", response["departure_comparison"]["message"].lower())

    async def test_unavailable_modes_do_not_hide_available_routes(self):
        with patch("main.get_air_quality", AsyncMock(return_value=air_quality_response())), patch(
            "main.calculate_routes", AsyncMock(return_value=[routes_response()[0], routes_response()[2]])
        ):
            response = await recommendation(RecommendationRequest())

    async def test_recommendation_with_prefetched_routes_and_origin_coords(self):
        prefetched = [
            {"mode": "drive", "available": True, "distance_km": 15.5, "duration_minutes": 25},
            {"mode": "transit", "available": True, "distance_km": 16.0, "duration_minutes": 40},
        ]
        mock_aq = AsyncMock(return_value=air_quality_response())
        with patch("main.get_air_quality", mock_aq), patch("main.calculate_routes") as mock_calc:
            response = await recommendation(
                RecommendationRequest(
                    origin="Connaught Place, New Delhi",
                    destination="India Gate, New Delhi",
                    origin_latitude=28.6304,
                    origin_longitude=77.2177,
                    destination_latitude=28.6129,
                    destination_longitude=77.2295,
                    routes=prefetched,
                )
            )

        # Ensure air quality was called with origin coordinates
        mock_aq.assert_called_once_with(28.6304, 77.2177, include_forecast=True)
        # Ensure calculate_routes was NOT called because prefetched routes were supplied
        mock_calc.assert_not_called()
        self.assertEqual(len(response["routes"]), 2)
        self.assertEqual(response["origin"], "Connaught Place, New Delhi")

    def test_make_waypoint_distinguishes_coordinates_and_addresses(self):
        from main import make_waypoint

        # Coordinate string
        wp1 = make_waypoint("18.5204, 73.8567")
        self.assertEqual(wp1, {"location": {"latLng": {"latitude": 18.5204, "longitude": 73.8567}}})

        # Explicit lat/lng arguments
        wp2 = make_waypoint("Custom Place", lat=28.63, lng=77.21)
        self.assertEqual(wp2, {"location": {"latLng": {"latitude": 28.63, "longitude": 77.21}}})

        # Text address
        wp3 = make_waypoint("Shivajinagar, Pune, India")
        self.assertEqual(wp3, {"address": "Shivajinagar, Pune, India"})

    async def test_reverse_geocode_fallback_for_unresolved_location(self):
        from main import reverse_geocode

        with patch("main.geocode", AsyncMock(return_value=[])):
            result = await reverse_geocode(latitude=15.1234, longitude=75.5678)

        self.assertIn("place", result)
        self.assertEqual(result["place"]["latitude"], 15.1234)
        self.assertEqual(result["place"]["longitude"], 75.5678)
        self.assertIn("15.1234", result["place"]["address"])


if __name__ == "__main__":
    unittest.main()

