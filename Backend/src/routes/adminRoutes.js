import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { verifyUser, approveCar, dashboardStats, pendingApprovals, adminAnalytics } from "../controllers/adminController.js";

const router = express.Router();

// Protect all admin routes
router.use(authMiddleware(["admin"]));

router.put("/verify-user/:id", verifyUser);
router.put("/approve-car/:id", approveCar);
router.get("/dashboard", dashboardStats);
router.get("/pending", pendingApprovals);
router.get("/analytics", adminAnalytics);

export default router;
