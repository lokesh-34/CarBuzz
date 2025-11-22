# GPS Tracking Testing Guide

## Quick Start Testing

### Prerequisites
1. Backend server running on `http://localhost:5000`
2. Frontend dev server running (Vite)
3. At least one confirmed booking in database
4. Browser with location permission (HTTPS or localhost)

## Test Scenarios

### Scenario 1: Basic GPS Tracking (Single User)

**Setup:**
1. Open browser DevTools → Console (to see WebSocket logs)
2. Navigate to `/live/:bookingId` (use actual booking ID from database)

**Steps:**
1. Click **"Start GPS Sharing"** button (turns green: 📍 Sharing GPS)
2. Grant location permission when prompted
3. Wait 2-3 seconds for first GPS fix
4. Observe:
   - Map marker appears at your location
   - Speed displays (may be 0 if stationary)
   - Route polyline starts forming
   - Chart updates in real-time

**Expected Console Output:**
```
Connected to socket.io server
Joined trip room: trip:bookingId123
GPS position acquired: {latitude: 12.9716, longitude: 77.5946}
Emitted driverLocation: {tripId, lat, lng, speed}
Received locationUpdate: {tripId, lat, lng, speed, ts}
```

**Validation:**
- ✅ Marker moves as you move (if on mobile device)
- ✅ Speed updates (walk around to see non-zero values)
- ✅ Polyline extends with each position
- ✅ Chart shows speed over time

---

### Scenario 2: Multi-Viewer Test (Driver + Passenger)

**Setup:**
1. Open two browser windows/tabs
2. Window 1 (Driver): `/live/:bookingId`
3. Window 2 (Viewer): `/live/:bookingId`

**Steps:**
1. **Window 1**: Enable GPS sharing
2. **Window 2**: Should automatically receive updates (no GPS toggle needed)
3. Move device (if mobile) or wait for GPS drift
4. Observe both windows update simultaneously

**Expected Behavior:**
- ✅ Both windows show same marker position
- ✅ Both display same speed
- ✅ Both charts mirror each other
- ✅ Real-time sync (<1s delay)

---

### Scenario 3: Provider Dashboard Tracking

**Setup:**
1. Login as car provider
2. Navigate to Provider Dashboard
3. Find confirmed booking in "Bookings" tab

**Steps:**
1. Click **"Live Track"** button on confirmed booking
2. Modal opens with map
3. Click **GPS toggle** (📍 button) for testing
4. Grant location permission
5. Observe tracking in modal

**Expected:**
- ✅ Modal shows map with live updates
- ✅ Speed widget updates
- ✅ Chart renders
- ✅ Can close modal and reopen without losing connection

---

### Scenario 4: Pickup Time Validation

**Setup:**
1. Create booking with future pickup time (e.g., 1 hour from now)
2. Get booking ID and pickup timestamp

**Steps:**
1. Navigate to `/live/:bookingId?pickupAt=<timestamp>`
   - Example: `/live/abc123?pickupAt=1700000000000`
2. Observe countdown: "Tracking will start at pickup time. Starts in 01:00:00"
3. Wait for countdown to reach 0 (or adjust system time for quick test)
4. GPS button should appear automatically

**Backend Validation Test:**
Open browser console and try to manually emit location *before* pickup time:
```javascript
// This should be rejected by backend
socket.emit('driverLocation', {
  tripId: 'bookingId',
  lat: 12.9716,
  lng: 77.5946,
  speed: 0
});
```

**Expected:**
- ✅ Countdown displays correctly
- ✅ GPS disabled until countdown = 0
- ✅ Backend rejects early location updates
- ✅ `trackingError` event received with `secondsToStart`

---

### Scenario 5: Fallback Simulation Mode

**Setup:**
1. Deny location permission or use browser without GPS
2. Navigate to `/live/:bookingId`

**Steps:**
1. Wait 1.5 seconds (fallback timeout)
2. Observe simulation path starts automatically
3. Map shows predefined route from Bangalore
4. Speed varies according to simulation data

**Expected:**
- ✅ Map shows movement along simulated path
- ✅ Speed changes (0 → 22 → 30 → 34 → 18 → 0 km/h)
- ✅ Trip ends after ~12 seconds (6 points × 2s interval)
- ✅ Summary chart displays at end

---

### Scenario 6: Trip End Workflow

**Steps:**
1. Start GPS tracking (any scenario above)
2. Collect few position points
3. Click **"End Trip"** button

**Expected:**
1. GPS tracking stops immediately
2. `endTrip` event emitted to server
3. All viewers receive `tripEnded` event
4. Summary chart appears (Speed vs Time - final)
5. Map remains at last position (no further updates)

**Backend Check:**
```bash
curl http://localhost:5000/api/tracking/:tripId/history
```
Should return all collected positions.

---

## Testing Without Mobile Device (Desktop)

### Simulate Movement
Most desktop browsers report static GPS (WiFi/IP-based). To see movement:

**Option 1: Browser DevTools Sensor Override**
1. Chrome DevTools → ⋮ → More tools → Sensors
2. Set custom location
3. Change coordinates periodically

**Option 2: Browser Extension**
- "Location Guard" or "Manual Geolocation"
- Set custom coordinates
- Change while tracking active

**Option 3: Use Simulation Mode**
- Don't enable GPS sharing
- Let simulation run (automatic)

---

## Troubleshooting Common Issues

### ❌ "GPS error: User denied Geolocation"
**Fix:** Settings → Site Settings → Location → Allow

### ❌ Speed always shows 0
**Cause:** Not moving or GPS has no speed data
**Fix:** 
- Walk around (outdoor better)
- Use browser sensor override
- Speed calculated from distance requires movement

### ❌ No location updates received
**Check:**
1. Backend logs: `node backend/src/server.js`
2. Look for "driverLocation error" or validation messages
3. Verify booking exists and status = "confirmed"
4. Check pickup time not in future

### ❌ WebSocket disconnects frequently
**Cause:** Network instability or CORS
**Fix:**
- Check backend CORS settings
- Verify `baseURL` in `frontend/src/api.js` is correct
- Enable WebSocket long-polling fallback (already enabled)

### ❌ Map doesn't center on marker
**Cause:** FollowMapCenter component issue
**Fix:** Already implemented in LiveTracking.jsx (should work)

---

## Production Testing Checklist

- [ ] Test on actual mobile device (iOS + Android)
- [ ] Test GPS accuracy outdoor vs indoor
- [ ] Test battery impact (extended tracking session)
- [ ] Test with slow/intermittent network
- [ ] Test multi-user scenario (5+ viewers)
- [ ] Verify pickup time validation works across timezones
- [ ] Check HTTPS requirement (Geolocation won't work on HTTP in prod)
- [ ] Load test: 100+ position updates per trip
- [ ] Security: Ensure only authorized users can share GPS
- [ ] Data persistence: Verify trip history survives server restart

---

## Debug Commands

### Check Active Socket Connections
Backend console will show:
```
Client connected: <socket-id>
```

### Monitor Location Events
Add to `server.js` temporarily:
```javascript
socket.on('driverLocation', async (payload) => {
  console.log('📍 Location received:', payload);
  // ... existing code
});
```

### Inspect Trip History
```bash
# While tracking active
curl http://localhost:5000/api/tracking/:bookingId/history | json_pp
```

### Force Trip End (Backend)
```javascript
// In server.js or via admin endpoint
io.to(`trip:${bookingId}`).emit('tripEnded', { tripId: bookingId, ts: Date.now() });
```

---

## Performance Metrics

### Expected Values
- **GPS Update Frequency**: 1-3 seconds (browser default)
- **WebSocket Latency**: <100ms (local), <500ms (cloud)
- **Position Accuracy**: ±10-50 meters (GPS), ±100-500m (WiFi)
- **Memory Usage**: ~50KB per trip (500 positions × ~100 bytes)
- **Battery Impact**: Moderate (similar to Google Maps)

### Monitoring
```javascript
// Add to frontend console for diagnostics
setInterval(() => {
  console.log('Trip stats:', {
    positions: positions.length,
    connected: socketRef.current?.connected,
    gpsActive: !!gpsWatchRef.current,
    latestSpeed: positions[positions.length-1]?.speed
  });
}, 5000);
```

---

## Quick Test Command Sequence

```bash
# Terminal 1: Start backend
cd Backend
npm run dev

# Terminal 2: Start frontend  
cd frontend
npm run dev

# Browser 1: Driver
# Open http://localhost:5173/live/<bookingId>
# Click "Start GPS Sharing"

# Browser 2: Viewer (Incognito/Private)
# Open http://localhost:5173/live/<bookingId>
# Observe automatic updates

# Verify in Terminal 1 (backend logs):
# Should see: "Client connected", "Joined trip room", "Location received"
```

---

**Happy Testing! 🚗📍**
