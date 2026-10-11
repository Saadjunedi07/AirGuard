import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { divIcon, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapPlace {
  address: string;
  latitude: number;
  longitude: number;
  place_id?: string | null;
}

export interface RouteMapProps {
  origin: MapPlace | null;
  destination: MapPlace | null;
  encodedPolyline?: string;
  activeMarker: 'origin' | 'destination';
  onSetActiveMarker?: (marker: 'origin' | 'destination') => void;
  onMapClick: (latitude: number, longitude: number) => void;
  onMarkerDrag?: (type: 'origin' | 'destination', latitude: number, longitude: number) => void;
  isLoadingRoute?: boolean;
  isResolvingLocation?: boolean;
  routeUnavailableMessage?: string | null;
  activeLayer?: 'standard' | 'air_quality' | 'traffic';
}

const markerIcon = (color: string, label: string, title: string) =>
  divIcon({
    className: 'airguard-map-marker',
    html: `<div title="${title}" style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9999px;background:${color};border:2.5px solid white;box-shadow:0 3px 8px rgba(0,0,0,.38);color:#fff;font-weight:700;font-size:13px;font-family:Inter,sans-serif;cursor:grab;transition:transform 0.15s ease">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });

export const decodePolyline = (encoded: string): [number, number][] => {
  if (!encoded || typeof encoded !== 'string') return [];
  const points: [number, number][] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  try {
    while (index < encoded.length) {
      let result = 0;
      let shift = 0;
      let byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);
      latitude += result & 1 ? ~(result >> 1) : result >> 1;
      result = 0;
      shift = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);
      longitude += result & 1 ? ~(result >> 1) : result >> 1;
      points.push([latitude / 1e5, longitude / 1e5]);
    }
  } catch (err) {
    console.error('Failed to decode polyline:', err);
    return [];
  }
  return points;
};

const MapEvents = ({ onMapClick }: Pick<RouteMapProps, 'onMapClick'>) => {
  useMapEvents({
    click: (event) => onMapClick(event.latlng.lat, event.latlng.lng),
  });
  return null;
};

const FitRoute = ({ positions }: { positions: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(positions, { padding: [45, 45], maxZoom: 14 });
    } else if (positions.length === 1) {
      map.setView(positions[0], 13);
    }
  }, [map, positions]);
  return null;
};

const MapResizeHandler = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

const RecenterButton = ({ positions }: { positions: [number, number][] }) => {
  const map = useMap();
  if (positions.length === 0) return null;
  return (
    <div className="absolute top-3 right-3 z-[1000]">
      <button
        type="button"
        onClick={() => {
          if (positions.length > 1) {
            map.fitBounds(positions, { padding: [45, 45], maxZoom: 14 });
          } else if (positions.length === 1) {
            map.setView(positions[0], 14);
          }
        }}
        className="bg-white/95 hover:bg-white text-[#191c1e] text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-md border border-[#e0e3e5] flex items-center gap-1.5 transition-colors cursor-pointer"
        title="Fit viewport to route"
        aria-label="Fit viewport to route"
      >
        <span className="material-symbols-outlined text-[16px] text-[#006591]">crop_free</span>
        <span>Fit Route</span>
      </button>
    </div>
  );
};

export const RouteMap = ({
  origin,
  destination,
  encodedPolyline,
  activeMarker,
  onSetActiveMarker,
  onMapClick,
  onMarkerDrag,
  isLoadingRoute = false,
  isResolvingLocation = false,
  routeUnavailableMessage = null,
}: RouteMapProps) => {
  const routePositions = useMemo(
    () => (encodedPolyline ? decodePolyline(encodedPolyline) : []),
    [encodedPolyline]
  );

  const markerPositions = useMemo(() => {
    return [origin, destination]
      .filter((place): place is MapPlace => place !== null)
      .map((place) => [place.latitude, place.longitude] as [number, number]);
  }, [origin, destination]);

  const fitPositions = routePositions.length > 1 ? routePositions : markerPositions;

  // Default initial center: selected origin, or Pune fallback if no markers set
  const defaultCenter: LatLngExpression = origin
    ? [origin.latitude, origin.longitude]
    : [18.5204, 73.8567];

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom
        className="h-full w-full rounded-2xl z-0"
        aria-label="Interactive route map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <MapResizeHandler />
        <MapEvents onMapClick={onMapClick} />
        <FitRoute positions={fitPositions} />
        <RecenterButton positions={fitPositions} />

        {origin && (
          <Marker
            position={[origin.latitude, origin.longitude]}
            icon={markerIcon('#006591', 'O', 'Origin: ' + origin.address)}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const target = e.target as { getLatLng: () => { lat: number; lng: number } };
                const latlng = target.getLatLng();
                onMarkerDrag?.('origin', latlng.lat, latlng.lng);
              },
            }}
          >
            <Popup>
              <div className="text-xs p-1">
                <span className="font-bold text-[#006591] block mb-0.5">● Origin (Start)</span>
                <p className="text-[#191c1e] text-[11px] leading-tight mb-1">{origin.address}</p>
                <span className="text-[10px] text-[#6e7881]">
                  {origin.latitude.toFixed(4)}, {origin.longitude.toFixed(4)} · Drag to move
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {destination && (
          <Marker
            position={[destination.latitude, destination.longitude]}
            icon={markerIcon('#006b5f', 'D', 'Destination: ' + destination.address)}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const target = e.target as { getLatLng: () => { lat: number; lng: number } };
                const latlng = target.getLatLng();
                onMarkerDrag?.('destination', latlng.lat, latlng.lng);
              },
            }}
          >
            <Popup>
              <div className="text-xs p-1">
                <span className="font-bold text-[#006b5f] block mb-0.5">● Destination (End)</span>
                <p className="text-[#191c1e] text-[11px] leading-tight mb-1">{destination.address}</p>
                <span className="text-[10px] text-[#6e7881]">
                  {destination.latitude.toFixed(4)}, {destination.longitude.toFixed(4)} · Drag to move
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Double-layered polyline for sharp contrast on light tiles */}
        {routePositions.length > 1 && (
          <>
            <Polyline
              positions={routePositions}
              pathOptions={{
                color: '#003751',
                weight: 7,
                opacity: 0.35,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            <Polyline
              positions={routePositions}
              pathOptions={{
                color: '#006591',
                weight: 4.5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}
      </MapContainer>

      {/* Top Left: Status Indicators */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-1.5 pointer-events-none">
        {isLoadingRoute && (
          <div className="rounded-lg bg-white/95 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-[#006591] shadow-md border border-[#c9e6ff] flex items-center gap-2 animate-pulse">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#006591] animate-ping" />
            <span>Calculating live route...</span>
          </div>
        )}

        {isResolvingLocation && (
          <div className="rounded-lg bg-white/95 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-[#006b5f] shadow-md border border-[#71f8e4] flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
            <span>Resolving clicked location...</span>
          </div>
        )}

        {routeUnavailableMessage && !isLoadingRoute && (
          <div className="rounded-lg bg-amber-50/95 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-md border border-amber-200 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-amber-600">warning</span>
            <span>{routeUnavailableMessage}</span>
          </div>
        )}
      </div>

      {/* Bottom Left Controls: Active Marker Selector and Instruction Pill */}
      <div className="absolute bottom-3 left-3 z-[1000] flex flex-col gap-1.5">
        <div className="flex items-center gap-1 rounded-xl bg-white/95 backdrop-blur-md p-1 shadow-md border border-[#e0e3e5]">
          <span className="text-[10px] font-medium text-[#6e7881] px-1.5 hidden sm:inline">
            Click map sets:
          </span>
          <button
            type="button"
            onClick={() => onSetActiveMarker?.('origin')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeMarker === 'origin'
                ? 'bg-[#006591] text-white shadow-xs'
                : 'text-[#3e4850] hover:bg-[#eceef0]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-white inline-block" />
            Origin (O)
          </button>
          <button
            type="button"
            onClick={() => onSetActiveMarker?.('destination')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              activeMarker === 'destination'
                ? 'bg-[#006b5f] text-white shadow-xs'
                : 'text-[#3e4850] hover:bg-[#eceef0]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-white inline-block" />
            Destination (D)
          </button>
        </div>

        <div className="pointer-events-none rounded-lg bg-white/90 backdrop-blur-md px-2.5 py-1 text-[10px] text-[#6e7881] shadow-xs border border-white/60">
          💡 Click map to place <strong>{activeMarker}</strong> or drag markers to refine.
        </div>
      </div>
    </div>
  );
};
