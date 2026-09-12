import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Authentication Middleware
 * Protects routes by validating JWT from the Authorization header
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: Malformed token.',
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'crickpulse_super_secret_jwt_key_2026');

    // Fetch user from DB excluding password
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: User no longer exists.',
      });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({
        success: false,
        message: 'Account disabled: Your account has been suspended by an administrator.',
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: Token has expired. Please log in again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed: Invalid token.',
    });
  }
};

/**
 * Optional Authentication Middleware
 * Attaches req.user if a valid token is provided; otherwise proceeds as anonymous
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'crickpulse_super_secret_jwt_key_2026'
    );

    const user = await User.findById(decoded.id);
    if (user && user.status !== 'disabled') {
      req.user = user;
    }
    next();
  } catch (error) {
    // If token is invalid or expired, gracefully continue without req.user
    next();
  }
};
