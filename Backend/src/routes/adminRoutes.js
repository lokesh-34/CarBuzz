import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { 
  verifyUser, 
  approveCar, 
  dashboardStats, 
  pendingApprovals, 
  adminAnalytics,
  getAllUsers,
  getAllProviders,
  getAllCars,
  getAllBookings
} from "../controllers/adminController.js";

const router = express.Router();

// Protect all admin routes
router.use(authMiddleware(["admin"]));

router.put("/verify-user/:id", verifyUser);
router.put("/approve-car/:id", approveCar);
router.get("/dashboard", dashboardStats);
router.get("/pending", pendingApprovals);
router.get("/analytics", adminAnalytics);
router.get("/all-users", getAllUsers);
router.get("/all-providers", getAllProviders);
router.get("/all-cars", getAllCars);
router.get("/all-bookings", getAllBookings);

export default router;
