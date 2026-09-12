import { authMiddleware } from './authMiddleware.js';

/**
 * Admin Authorization Middleware
 * Ensures the requesting user is authenticated and possesses the 'admin' role.
 * Protects all administrative endpoints on the backend.
 */
export const requireAdmin = [
  authMiddleware,
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: User profile not loaded.',
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Administrator privileges required.',
      });
    }

    next();
  },
];

export default requireAdmin;
