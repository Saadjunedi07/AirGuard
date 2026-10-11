<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# AirGuard frontend

## Run locally

1. Start the FastAPI backend from `../backend`:
   `./.venv/Scripts/python.exe -m uvicorn main:app --reload --port 8000`
2. In this directory, install packages and start Vite:
   `npm install`
   `npm run dev`

The local frontend uses `http://localhost:8000` by default. For a deployed API,
copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` to its public
base URL. `VITE_` variables are public browser values: never place API keys in them.

## AirGuard 2.0 data notes

- Route distance and duration are live only when Google Routes returns a usable
  result. A missing PMPML bus-only result remains explicitly unavailable.
- AQI is city-level Open-Meteo data. Route exposure indices are transparent
  estimates: city AQI × route duration × travel-mode factor; they are not
  personal or route-specific pollution measurements.
- The departure comparison uses Open-Meteo hourly AQI forecasts when they are
  available. The UI shows an unavailable state instead of creating a forecast.
- Health profiles adjust the balance between estimated exposure and travel time;
  they do not provide medical advice or make health claims.
