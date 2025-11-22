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
    <div className="min-h-screen bg-gray-50 px-4 py-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Live Tracking {tripId ? `— Trip ${tripId}` : ''}</h1>
            <p className="text-xs text-gray-500">
              {connected ? 'Connected' : 'Waiting for updates'}
              {isDriver && ' • GPS Active'}
              {error ? ` — ${error}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isDriver && (
              <div className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1 text-sm font-medium text-white">
                <span className="animate-pulse">📍</span>
                <span>Sharing Location</span>
              </div>
            )}
            <button className="rounded-lg bg-gray-100 px-3 py-1 text-sm" onClick={() => navigate(-1)}>Back</button>
          </div>
        </div>

        {pickupAt && secondsToPickup > 0 && (
          <div className="mb-3 rounded-lg border bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
            Tracking will start at pickup time. Starts in {pickupCountdown}.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="col-span-2 h-[520px] overflow-hidden rounded-xl border bg-white">
            <MapContainer center={latest ? [latest.lat, latest.lng] : [12.9716, 77.5946]} zoom={14} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {latest && <FollowMapCenter lat={latest.lat} lng={latest.lng} />}
              {positions.length > 0 && (
                <>
                  <Marker position={[latest.lat, latest.lng]}>
                    <Popup>
                      Speed: {latest.speed} km/h<br />
                      Time: {new Date(latest.ts).toLocaleTimeString()}
                    </Popup>
                  </Marker>
                  <Polyline positions={positions.map((p) => [p.lat, p.lng])} color="#2563eb" />
                </>
              )}
            </MapContainer>
          </div>
          <div className="col-span-1 rounded-xl border bg-white p-4">
            <div className="mb-4 rounded-lg border bg-gray-50 p-3">
              <div className="text-sm text-gray-500">Current Speed</div>
              <div className="mt-2 text-3xl font-bold text-blue-600">{latest ? `${latest.speed} km/h` : '--'}</div>
              <div className="mt-1 text-xs text-gray-500">{latest ? new Date(latest.ts).toLocaleTimeString() : ''}</div>
            </div>

            <div className="mb-4 rounded-lg border bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Trip Stats</div>
                <button 
                  className="text-xs text-red-600 hover:text-red-800" 
                  onClick={() => {
                    if (socketRef.current?.connected && tripId) {
                      socketRef.current.emit('endTrip', { tripId });
                    }
                    setTripEnded(true);
                    stopGPSTracking();
                  }}
                >
                  End Trip
                </button>
              </div>
              <div className="mt-3 text-sm text-gray-600">Points: {positions.length}</div>
            </div>

            <div className="h-64">
              <div className="text-sm font-medium">Speed vs Time</div>
              {positions.length === 0 ? (
                <div className="mt-6 text-center text-sm text-gray-500">Waiting for data…</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={speedSeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis unit="km/h" />
                    <Tooltip />
                    <Line type="monotone" dataKey="speed" stroke="#8884d8" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {tripEnded && (
          <div className="mt-4 rounded-xl border bg-white p-4">
            <div className="text-sm font-medium">Trip finished — Speed vs Time summary</div>
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={speedSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis unit="km/h" />
                  <Tooltip />
                  <Line type="monotone" dataKey="speed" stroke="#ff5722" dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
