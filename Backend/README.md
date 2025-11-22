# Self-Driving Car Portal — Backend

## Quick Start
```bash
cd self-driving-car-portal-backend
cp .env.example .env
npm install
npm run dev
# optional: seed admin
npm run seed
```

### Test Routes
- POST `/api/auth/register` (form-data: license file optional)
- POST `/api/auth/login`
- GET `/api/auth/me` (Bearer token)
- GET `/api/cars/search?lat=...&lng=...&radius=5000&type=suv&minPrice=100&maxPrice=600`
- Provider (Bearer token with role=provider):
  - POST `/api/cars/add` (form-data files: rc, insurance, fitness, puc; fields: make, model, type, pricePerHour, lat, lng)
  - GET `/api/cars/mine`
  - PATCH `/api/cars/:id/availability`
- Bookings:
  - POST `/api/bookings` (user) body: { carId, startTime, endTime }
  - GET `/api/bookings/mine` (user)
  - GET `/api/bookings/provider` (provider)
  - POST `/api/bookings/:id/unlock` (user)
  - POST `/api/bookings/:id/unlock/validate` (provider/admin) body: { otp }
- Admin:
  - GET `/api/admin/stats`
  - GET `/api/admin/pending`
  - POST `/api/admin/verify-user/:id`
  - POST `/api/admin/approve-car/:id`

### Live Tracking

Socket.io events:
- Client emits `joinTrip` with `{ tripId }` to start receiving updates.
- Server emits `locationUpdate` with `{ tripId, lat, lng, speed, ts }`.
- Server emits `tripEnded` with `{ tripId, ts }` when the trip completes.
- Optional client emits `driverLocation` with `{ tripId, lat, lng, speed }` (if driver uses socket).

REST fallbacks (if driver cannot use websockets):
- `POST /api/tracking/:tripId/location` body: `{ lat: number, lng: number, speed?: number }`
- `POST /api/tracking/:tripId/end`
- `GET  /api/tracking/:tripId/history`

Notes:
- Tracking data is stored in memory (last 500 points). Use Redis/DB for persistence in production.
- CORS origins can be configured via `ORIGIN_LIST` env var.

### Notes
- Geospatial search uses a 2dsphere index on `Car.location`.
- Payments are stubbed (amount is computed; integrate Razorpay/Stripe later).
- Unlock flow generates OTP + QR (PNG data URL) valid around start time.
- File uploads are stored under `src/uploads` (served via `/uploads`).

### Email Notifications
Configure SMTP credentials in `.env` to enable emails:

```
SMTP_HOST=smtp.yourhost.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass
SMTP_SECURE=false
MAIL_FROM="CarBuzz <no-reply@yourdomain.com>"
```

When configured:
- On booking creation (user): provider receives an email with booking request details.
- On booking status update (provider): user receives an email with the new status and summary.

