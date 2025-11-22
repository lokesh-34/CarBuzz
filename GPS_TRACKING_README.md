# Real-Time GPS Tracking Feature

## Overview
The self-driving car booking platform now includes real-time GPS tracking that captures and broadcasts the vehicle's location from the moment the trip starts (pickup time) until it ends.

## Features

### 1. **Trip Start Time Validation**
- Backend validates that GPS data is only accepted **after** the scheduled pickup time
- Prevents premature or unauthorized location tracking
- Returns error with countdown if trip hasn't started yet

### 2. **Real GPS Location Capture**
- Uses browser's Geolocation API (`navigator.geolocation.watchPosition`)
- High accuracy mode enabled for precise tracking
- Automatic speed calculation from GPS or distance/time delta
- Speed converted from m/s to km/h

### 3. **Real-Time Broadcasting**
- Location updates sent via WebSocket (Socket.IO)
- All clients viewing the trip receive live updates
- In-memory history (last 500 points) sent to new viewers
- Low-latency updates for smooth tracking experience

### 4. **Fallback Simulation**
- If WebSocket fails or GPS unavailable, uses simulation mode
- Ensures UI remains testable without real GPS hardware
- Automatically switches to real GPS when available

## Architecture

### Backend (`server.js`)

#### Socket Events
- **`joinTrip`**: Client joins a trip room to receive updates
- **`driverLocation`**: Driver sends GPS coordinates (validated against pickup time)
- **`locationUpdate`**: Broadcast to all trip viewers
- **`endTrip`**: Signal trip completion
- **`trackingError`**: Error messages (e.g., trip not started)

#### REST Endpoints
- **POST** `/api/tracking/:tripId/location` - Push GPS location (with pickup validation)
- **POST** `/api/tracking/:tripId/end` - End trip
- **GET** `/api/tracking/:tripId/history` - Retrieve location history

#### Validation Logic
```javascript
// Backend checks:
1. Trip (booking) exists and is confirmed
2. Current time >= pickup date/time
3. Valid coordinates (lat/lng as numbers)
4. Caches pickup timestamp for performance
```

### Frontend

#### LiveTracking Page (`/live/:tripId`)
- **GPS Sharing Toggle**: "Start GPS Sharing" button enables driver mode
- **Real-time Map**: Leaflet map with marker and polyline route
- **Speed Display**: Current speed in km/h
- **Countdown**: Shows time until pickup if accessed early
- **Speed vs Time Chart**: Real-time graph (Recharts)
- **End-of-trip Summary**: Final speed chart when trip ends

#### Provider Dashboard Modal
- Same GPS tracking in modal overlay
- GPS toggle for testing (normally view-only for provider)
- Countdown gating until pickup time
- Simulation fallback for reliability

## Usage

### For Drivers (GPS Sharing)

1. **Navigate to tracking page**: `/live/:bookingId`
2. **Click "Start GPS Sharing"** button (turns green: 📍 Sharing GPS)
3. **Grant location permission** when browser prompts
4. **GPS automatically starts** after pickup time
5. Location sent every few seconds via WebSocket
6. **Click "End Trip"** when journey complete

### For Viewers (Passengers/Providers)

1. **Open tracking page**: `/live/:bookingId` or click "Live Track" in dashboard
2. **Map updates automatically** as driver shares location
3. **View speed and route** in real-time
4. **No action needed** - passive viewing mode

### Testing Without GPS

1. Access tracking page without enabling GPS sharing
2. System automatically uses **simulation mode** after 1.5s timeout
3. Predefined route plays out for testing UI

## Technical Details

### GPS Calculation
```javascript
// Speed calculation priority:
1. GPS-provided speed (if available) → converted m/s to km/h
2. Calculated from distance/time using Haversine formula
3. Default to 0 if no prior position
```

### Haversine Distance Formula
Used to calculate distance between two GPS coordinates:
```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}
```

### Geolocation API Options
```javascript
{
  enableHighAccuracy: true,  // Use GPS instead of WiFi/Cell tower
  timeout: 5000,              // 5 second timeout
  maximumAge: 0               // No caching, fresh location only
}
```

## Security Considerations

### Current Implementation
- ✅ Trip must be confirmed (status check)
- ✅ Pickup time validation (prevents early tracking)
- ✅ Coordinate type validation
- ✅ History cap (500 points max)

### Recommended Enhancements
- ⚠️ Add JWT authentication to tracking endpoints
- ⚠️ Validate requester is the actual driver (user ID check)
- ⚠️ Rate limiting on location updates
- ⚠️ Persist trip history to MongoDB (currently in-memory)
- ⚠️ HTTPS required for Geolocation API in production
- ⚠️ Add booking status checks (auto-end if cancelled)

## Browser Compatibility

### Required Features
- **Geolocation API**: Supported in all modern browsers
- **WebSocket**: Required for real-time updates
- **HTTPS**: Geolocation requires secure context (localhost or HTTPS)

### Tested Browsers
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (iOS/macOS)
- ✅ Mobile browsers (Android/iOS)

## Troubleshooting

### GPS Not Working
1. **Check browser permissions**: Settings → Site Settings → Location
2. **Ensure HTTPS** (or localhost for dev)
3. **Verify GPS hardware** (mobile devices usually better than laptops)
4. **Check console** for error messages

### No Location Updates
1. **Verify trip has started** (after pickup time)
2. **Check WebSocket connection** (Connected/Disconnected indicator)
3. **Backend validation**: Check server logs for `trackingError` events
4. **Fallback to simulation** will trigger after 1.5s if no socket

### Speed Shows 0
- Normal when stationary
- GPS speed may take few seconds to initialize
- Calculated speed requires movement between two positions

## Performance

### Optimization Strategies
- **In-memory storage**: Fast read/write (consider Redis for scale)
- **History capping**: Last 500 points only
- **Socket rooms**: Isolated broadcast per trip
- **Debouncing**: GPS updates every ~1-3 seconds (browser default)

### Scalability Notes
- Current: Single Node.js process with in-memory Map
- Production: Consider Redis for multi-server deployment
- WebSocket: Socket.IO supports clustering with Redis adapter

## Future Enhancements

1. **Persistent Storage**: MongoDB collection for trip telemetry
2. **Trip Analytics**: Average speed, total distance, route optimization
3. **Geofencing**: Alerts when vehicle deviates from route
4. **Driver Authentication**: Secure endpoint access
5. **Battery Optimization**: Adaptive GPS frequency based on speed
6. **Offline Support**: Queue location updates when offline
7. **Historical Playback**: Replay completed trips
8. **Multiple Vehicles**: Track fleet on single map view

## API Reference

### WebSocket Events

#### Client → Server
```javascript
// Join trip room
socket.emit('joinTrip', { tripId: 'booking123' });

// Send driver location (validated)
socket.emit('driverLocation', {
  tripId: 'booking123',
  lat: 12.9716,
  lng: 77.5946,
  speed: 45
});

// End trip
socket.emit('endTrip', { tripId: 'booking123' });
```

#### Server → Client
```javascript
// Location update (broadcast to room)
socket.on('locationUpdate', (data) => {
  // data: { tripId, lat, lng, speed, ts }
});

// Trip ended
socket.on('tripEnded', (data) => {
  // data: { tripId, ts }
});

// Error (e.g., trip not started)
socket.on('trackingError', (data) => {
  // data: { tripId, message, secondsToStart? }
});
```

### REST API

#### POST /api/tracking/:tripId/location
Push GPS location (alternative to WebSocket)

**Request Body:**
```json
{
  "lat": 12.9716,
  "lng": 77.5946,
  "speed": 45
}
```

**Responses:**
- `200 OK`: Location accepted and broadcast
- `400 Bad Request`: Invalid coordinates
- `403 Forbidden`: Trip not started yet (includes `secondsToStart`)
- `404 Not Found`: Trip doesn't exist or not confirmed

#### POST /api/tracking/:tripId/end
Signal trip completion

**Response:** `200 OK`

#### GET /api/tracking/:tripId/history
Retrieve location history

**Response:**
```json
{
  "tripId": "booking123",
  "positions": [
    { "lat": 12.9716, "lng": 77.5946, "speed": 45, "ts": 1700000000000 },
    ...
  ]
}
```

## Demo Flow

### Complete Tracking Scenario

1. **Booking Created**: User books car for pickup at 2:00 PM
2. **Pre-Trip Access**: Opening `/live/bookingId?pickupAt=...` shows countdown
3. **Pickup Time (2:00 PM)**: Countdown reaches 0, GPS button appears
4. **Driver Enables GPS**: Click "Start GPS Sharing", grant permission
5. **Real-Time Tracking**: Location updates every 1-3 seconds via WebSocket
6. **Viewers Join**: Provider/passenger open tracking page, see live map
7. **Trip Progress**: Map shows marker, route polyline, speed updates
8. **Trip End**: Driver clicks "End Trip", summary chart displayed
9. **History Available**: GET `/api/tracking/:tripId/history` returns full route

---

**Status**: ✅ Fully Implemented & Tested  
**Last Updated**: November 22, 2025
