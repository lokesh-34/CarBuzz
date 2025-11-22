import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import api, { baseURL } from "../api";
import { io } from "socket.io-client";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

// Leaflet icon fix (for Vite / Web builds without copying assets)
try {
  // eslint-disable-next-line no-underscore-dangle
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
} catch {}

function useCountdown(targetTs) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!targetTs) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetTs]);
  const diff = Math.max(0, (targetTs || 0) - now);
  const seconds = Math.floor(diff / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return { seconds, label: `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}` };
}

function FollowMapCenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (typeof lat === 'number' && typeof lng === 'number') {
      map.setView([lat, lng]);
    }
  }, [lat, lng, map]);
  return null;
}

export default function LiveTracking() {
  const { tripId: paramId } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const tripId = paramId || search.get('tripId') || '';

  // Pickup time: accept ?pickupAt=<ISO or ms> or else start immediately
  const pickupAtParam = search.get('pickupAt');
  const pickupAt = useMemo(() => {
    if (!pickupAtParam) return null;
    const n = Number(pickupAtParam);
    if (!Number.isNaN(n)) return new Date(n).getTime();
    const d = new Date(pickupAtParam);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }, [pickupAtParam]);
  const { seconds: secondsToPickup, label: pickupCountdown } = useCountdown(pickupAt);

  const [positions, setPositions] = useState([]); // { lat, lng, speed, ts }
  const [connected, setConnected] = useState(false);
  const [tripEnded, setTripEnded] = useState(false);
  const [error, setError] = useState('');
  const [isDriver, setIsDriver] = useState(false); // Auto-detected if user owns booking
  const [bookingData, setBookingData] = useState(null);
  const socketRef = useRef(null);
  const simRef = useRef(null);
  const gpsWatchRef = useRef(null);

  // Fetch booking to check if current user owns it and get pickup time
  useEffect(() => {
    let ignore = false;
    async function fetchBooking() {
      if (!tripId) return;
      try {
        const { data } = await api.get(`/api/bookings/${tripId}`);
        if (!ignore) {
          setBookingData(data);
          // Check if current user is the booking owner
          const token = localStorage.getItem('token');
          if (token) {
            try {
              const userRes = await api.get('/api/users/profile');
              const currentUserId = userRes.data?._id;
              // Auto-enable GPS if this user owns the booking
              if (currentUserId && data.userId === currentUserId) {
                setIsDriver(true);
              }
            } catch (err) {
              if (err.response?.status === 403 || err.response?.status === 401) {
                console.warn('Session expired. User not authenticated.');
                setError('Please login to share your location');
              } else {
                console.error('Failed to get user profile:', err);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch booking:', err);
        setError('Failed to load trip details');
      }
    }
    fetchBooking();
    return () => { ignore = true; };
  }, [tripId]);

  // Connect to socket after pickup
  useEffect(() => {
    // If pickupAt is provided and in the future, wait; otherwise start immediately
    if (pickupAt && secondsToPickup > 0) return;
    if (!tripId && !pickupAt) {
      // No trip id provided; we still allow simulation for demo
      startSimulation();
      return;
    }

    const socket = io(baseURL, { transports: ['websocket'], autoConnect: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      if (tripId) socket.emit('joinTrip', { tripId });
    });

    socket.on('locationUpdate', (payload) => {
      try {
        if (!payload) return;
        if (tripId && payload.tripId && payload.tripId !== tripId) return;
        console.log(`[LIVE TRACKING] Received location: lat=${payload.lat}, lng=${payload.lng}, speed=${payload.speed} km/h`);
        const item = {
          lat: Number(payload.lat),
          lng: Number(payload.lng),
          speed: Number(payload.speed || 0),
          ts: payload.ts ? new Date(payload.ts).getTime() : Date.now(),
        };
        if (Number.isFinite(item.lat) && Number.isFinite(item.lng)) {
          setPositions((p) => [...p, item]);
        }
      } catch (e) {
        console.error('Invalid payload', payload, e);
      }
    });

    socket.on('tripEnded', (payload) => {
      if (tripId && payload?.tripId && payload.tripId !== tripId) return;
      setTripEnded(true);
      stopGPSTracking();
    });

    socket.on('trackingError', (payload) => {
      const msg = payload?.message || 'Tracking error';
      console.warn('Tracking error:', msg);
      setError(msg);
    });

    socket.on('connect_error', (err) => {
      const msg = 'Backend server not connected. Using simulation mode.';
      console.warn(msg);
      setError(msg);
      // Fallback to simulation so page is testable even without backend
      startSimulation();
    });

    const fallbackTimeout = setTimeout(() => {
      if (!socket.connected) startSimulation();
    }, 1500);

    return () => {
      clearTimeout(fallbackTimeout);
      stopGPSTracking();
      try { socket.disconnect(); } catch {}
      if (simRef.current) { clearInterval(simRef.current); simRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, pickupAt, secondsToPickup]);

  // GPS Tracking: If user is the driver, capture and send location
  useEffect(() => {
    if (!isDriver || !tripId || !socketRef.current?.connected || tripEnded) return;
    if (pickupAt && secondsToPickup > 0) return; // Wait for pickup time
    
    startGPSTracking();
    
    return () => stopGPSTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDriver, tripId, tripEnded, secondsToPickup]);

  function startGPSTracking() {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }
    if (gpsWatchRef.current) return; // Already tracking
    
    let lastSpeed = 0;
    let lastPosition = null;
    let lastTime = Date.now();
    
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed: gpsSpeed } = position.coords;
        const currentTime = Date.now();
        
        // Calculate speed if not provided by GPS
        let calculatedSpeed = 0;
        if (gpsSpeed !== null && gpsSpeed !== undefined) {
          // GPS speed is in m/s, convert to km/h
          calculatedSpeed = gpsSpeed * 3.6;
        } else if (lastPosition) {
          // Calculate speed from distance and time
          const timeDiff = (currentTime - lastTime) / 1000; // seconds
          const distance = calculateDistance(
            lastPosition.latitude,
            lastPosition.longitude,
            latitude,
            longitude
          );
          calculatedSpeed = (distance / timeDiff) * 3.6; // km/h
        }
        
        console.log(`[LIVE TRACKING GPS] Current position: lat=${latitude.toFixed(6)}, lng=${longitude.toFixed(6)}, speed=${Math.round(calculatedSpeed)} km/h`);
        
        lastPosition = { latitude, longitude };
        lastTime = currentTime;
        lastSpeed = Math.round(calculatedSpeed);
        
        // Send location to backend
        if (socketRef.current?.connected) {
          console.log(`[LIVE TRACKING GPS] Sending location: lat=${latitude}, lng=${longitude}, speed=${lastSpeed} km/h`);
          socketRef.current.emit('driverLocation', {
            tripId,
            lat: latitude,
            lng: longitude,
            speed: lastSpeed,
          });
        }
      },
      (error) => {
        console.error('GPS error:', error);
        setError(`GPS error: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }

  function stopGPSTracking() {
    if (gpsWatchRef.current) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }
  }

  // Calculate distance between two coordinates in meters (Haversine formula)
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  function startSimulation() {
    if (simRef.current) return;
    const path = [
      { lat: 12.9716, lng: 77.5946, speed: 0 },
      { lat: 12.9722, lng: 77.5952, speed: 22 },
      { lat: 12.9730, lng: 77.5960, speed: 30 },
      { lat: 12.9740, lng: 77.5970, speed: 34 },
      { lat: 12.9750, lng: 77.5980, speed: 18 },
      { lat: 12.9760, lng: 77.5990, speed: 0 },
    ];
    let i = 0;
    simRef.current = setInterval(() => {
      if (i >= path.length) { clearInterval(simRef.current); simRef.current = null; setTripEnded(true); return; }
      const p = { ...path[i], ts: Date.now() };
      setPositions((s) => [...s, p]);
      i += 1;
    }, 2000);
  }

  const latest = positions.length ? positions[positions.length - 1] : null;

  const speedSeries = useMemo(() => positions.map(p => ({ time: new Date(p.ts).toLocaleTimeString(), speed: p.speed })), [positions]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                Live Tracking {tripId && `— Trip #${tripId.slice(-8)}`}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                <span className={`flex items-center gap-1 ${connected ? 'text-green-600' : 'text-gray-500'}`}>
                  <span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-600' : 'bg-gray-400'}`}></span>
                  {connected ? 'Connected' : 'Disconnected'}
                </span>
                {isDriver && (
                  <span className="flex items-center gap-1 text-green-600">
                    <span className="animate-pulse">📍</span>
                    Sharing Location
                  </span>
                )}
                {error && <span className="text-red-600">• {error}</span>}
              </div>
            </div>
            <button 
              onClick={() => navigate(-1)}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>

      {/* Countdown Banner */}
      {pickupAt && secondsToPickup > 0 && (
        <div className="border-b bg-yellow-50">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <div className="flex items-center gap-2 text-yellow-800">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Tracking starts in {pickupCountdown}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
              <div className="h-[500px] lg:h-[600px]">
                <MapContainer 
                  center={latest ? [latest.lat, latest.lng] : [12.9716, 77.5946]} 
                  zoom={14} 
                  style={{ height: '100%', width: '100%' }}
                  className="z-0"
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {latest && <FollowMapCenter lat={latest.lat} lng={latest.lng} />}
                  {positions.length > 0 && (
                    <>
                      <Marker position={[latest.lat, latest.lng]}>
                        <Popup>
                          <div className="text-sm">
                            <div className="font-semibold">Current Location</div>
                            <div>Speed: {latest.speed} km/h</div>
                            <div className="text-gray-600">{new Date(latest.ts).toLocaleTimeString()}</div>
                          </div>
                        </Popup>
                      </Marker>
                      <Polyline positions={positions.map((p) => [p.lat, p.lng])} color="#2563eb" weight={4} />
                    </>
                  )}
                </MapContainer>
              </div>
            </div>
          </div>

          {/* Stats & Chart Section */}
          <div className="space-y-6 lg:col-span-1">
            {/* Current Speed Card */}
            <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-white">
                <div className="text-sm font-medium opacity-90">Current Speed</div>
                <div className="mt-2 text-5xl font-bold">
                  {latest ? latest.speed : '--'}
                </div>
                <div className="mt-1 text-lg opacity-90">km/h</div>
                <div className="mt-3 text-xs opacity-75">
                  {latest ? new Date(latest.ts).toLocaleTimeString() : 'Waiting for data...'}
                </div>
              </div>
            </div>

            {/* Trip Stats Card */}
            <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Trip Statistics</h3>
                  <button 
                    onClick={() => {
                      if (socketRef.current?.connected && tripId) {
                        socketRef.current.emit('endTrip', { tripId });
                      }
                      setTripEnded(true);
                      stopGPSTracking();
                    }}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  >
                    End Trip
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Data Points</div>
                    <div className="mt-1 text-2xl font-bold text-gray-900">{positions.length}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Max Speed</div>
                    <div className="mt-1 text-2xl font-bold text-gray-900">
                      {positions.length > 0 ? Math.max(...positions.map(p => p.speed)) : 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Speed Chart Card */}
            <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
              <div className="p-4">
                <h3 className="font-semibold text-gray-900">Speed Over Time</h3>
                <div className="mt-4">
                  {positions.length === 0 ? (
                    <div className="flex h-48 items-center justify-center text-sm text-gray-500">
                      <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <div className="mt-2">Waiting for tracking data...</div>
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={speedSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                        <YAxis unit="km/h" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        />
                        <Line type="monotone" dataKey="speed" stroke="#2563eb" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trip Summary */}
        {tripEnded && positions.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm">
            <div className="border-b bg-gray-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Trip Summary</h2>
              <p className="text-sm text-gray-600">Complete speed analysis for this journey</p>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={speedSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="time" stroke="#9ca3af" />
                  <YAxis unit="km/h" stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="speed" stroke="#ff5722" strokeWidth={2} dot={{ fill: '#ff5722', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
