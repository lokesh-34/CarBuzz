// src/middlewares/authMiddleware.js
import jwt from "jsonwebtoken";

export const authMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // attach user info to req
      req.user = decoded;

      // role check
      if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ message: "Forbidden: insufficient role" });
      }

      next();
    } catch (error) {
      console.error("Auth error:", error.message);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
};
