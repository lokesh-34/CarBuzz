# CarBuzz — Self‑Driving Rentals

CarBuzz is a full‑stack car rental portal for self‑driving vehicles. It includes:

- A React + Vite frontend with Tailwind CSS and toast notifications
- A Node.js/Express backend with MongoDB/Mongoose, JWT auth, image uploads, and email notifications
- Role‑based access (user, provider, admin), admin approvals, and availability management

## Features

- User registration with license upload and admin verification
- Provider registration and car listing with multiple images
- Car attributes: manufacturer, model, type, transmission, fuel type, seating capacity, vehicle registration, insurance status, RC details, description, price
- Admin dashboard to verify users and approve cars (emails to providers on approval)
- Booking flow with provider notifications; car availability is blocked during confirmed bookings until drop time
- Public listings only show approved + available cars; search endpoints adhere to the same rules
- Toast notifications and improved UI for login, dashboards, and actions

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Axios, React Router, React‑Toastify, Day.js
- Backend: Node.js, Express, MongoDB/Mongoose, JWT, Multer, Nodemailer, Socket.io, Day.js

## Project Structure

```
Backend/
  src/
    app.js            # Express app setup
    server.js         # HTTP + Socket.io bootstrap
    config/db.js      # Mongo connection
    middlewares/      # auth, upload
    models/           # User, Provider, Car, Booking
    controllers/      # Admin, Car (search), etc.
    routes/           # admin, users, providers, cars, bookings
    utils/            # mail, seed
  uploads/            # image uploads (served as /uploads)

frontend/
  src/
    pages/            # Pages (Login, Register, AdminDashboard, etc.)
    components/       # UI components
    api.js            # Axios instance
  public/
    logo.png          # App logo (place your logo here)
```

## Prerequisites

- Node.js 18+ and npm
- A MongoDB connection string
- An SMTP account (e.g., Gmail) for sending emails

## Backend Setup

1) Create an `.env` file under `Backend/` (example below):

```
MONGO_URI=your-mongodb-uri
JWT_SECRET=your-secret
PORT=5000

# Optional: auto-create an admin
SEED_ADMIN=true
SEED_ADMIN_NAME=Admin
SEED_ADMIN_EMAIL=admin@portal.com
SEED_ADMIN_PASSWORD=admin123

# SMTP (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=false
MAIL_FROM="CarBuzz <no-reply@yourdomain.com>"
```

2) Install dependencies and seed admin (PowerShell):

```powershell
cd Backend
npm install
npm run seed
```

3) Run the backend in dev mode:

```powershell
npm run dev
```

- Server runs at `http://localhost:5000`
- Static uploads are served from `http://localhost:5000/uploads/...`
- Health check: `http://localhost:5000/health`

## Frontend Setup

1) Create `frontend/.env` (or set env var) with API base URL:

```
VITE_API_BASE_URL=http://localhost:5000
```

2) Install and run (PowerShell):

```powershell
cd ..\frontend
npm install
npm run dev
```

- Vite dev server runs at `http://localhost:5173`

## Accounts & Roles

- Admin: seeded via env (`SEED_ADMIN_*`). Example:
  - Email: `admin@portal.com`
  - Password: `admin123`
- Users must be verified by an admin before they can book cars.
- Providers can add cars; cars must be approved by admin before they appear in public listings or can be booked.

## Key Flows

- Login: `POST /api/users/login` (works for all roles; JWT includes role)
- Users
  - Register with license photo; await admin verification
  - Book only when verified; on booking confirm, the car is held unavailable until drop time
- Providers
  - Add cars with images and details (vehicleReg, transmission, fuelType, etc.)
  - See booking requests and update statuses
- Admin
  - Verify users; approve cars (sends email to provider)
  - Admin page route in frontend: `/admin`

## Notable Endpoints (Backend)

- Users: `/api/users/register`, `/api/users/login`, `/api/users/profile`
- Cars: `GET /api/cars`, `GET /api/cars/search`, `GET /api/cars/mine`, `POST /api/cars/add`
- Bookings: `POST /api/bookings` (user-only, verified required), `PATCH /api/bookings/:id` (status updates)
- Admin: `GET /api/admin/pending`, `PUT /api/admin/verify-user/:id`, `PUT /api/admin/approve-car/:id`, `GET /api/admin/dashboard`

## Images & Uploads

- Car images are uploaded via `multer` and stored under `Backend/uploads/`
- Access from the frontend using the backend base URL, e.g.: `http://localhost:5000/uploads/<filename>`

## Email Notifications

- Provider: notified on new booking requests
- User: notified when provider updates booking status
- Provider: notified when admin approves their car
- Mailer is verified at server startup; check logs for SMTP status

## Development Tips

- If you see login 404/"User not found":
  - Verify email/password and that the backend is running
  - Ensure you used the exact seeded admin email from `.env`
- If images don’t render, check your `VITE_API_BASE_URL` and that `/uploads` is served by the backend
- Windows editors may warn about path casing differences (Backend vs backend); this doesn’t affect runtime on Windows

## License

This project is for educational/demo purposes. Add your preferred license if publishing.