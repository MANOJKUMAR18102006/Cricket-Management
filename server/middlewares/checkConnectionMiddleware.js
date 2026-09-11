import mongoose from 'mongoose';
import Player from '../models/Player.js';
import { canViewPlayerData, getPlayerForUser } from '../services/privacyService.js';

/**
 * Reusable Middleware: checkConnectionAuthorization
 * Guards protected cricket data endpoints (statistics, match history, performance records).
 * Enforces strict backend authorization using canViewPlayerData:
 * - Same player -> Allow
 * - Public target profile -> Allow
 * - Accepted connection -> Allow
 * - Otherwise -> HTTP 403 Forbidden
 */
export const checkConnectionMiddleware = async (req, res, next) => {
  try {
    // 1. Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to access cricket data.',
      });
    }

    const targetId = req.params.id || req.params.playerId;
    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target player ID format.',
      });
    }

    // Resolve target player document
    let targetPlayer = await Player.findById(targetId);
    if (!targetPlayer) {
      targetPlayer = await Player.findOne({ userId: targetId });
    }

    if (!targetPlayer) {
      return res.status(404).json({
        success: false,
        message: 'Target player not found.',
      });
    }

    // Resolve viewer's player document
    const viewerPlayer = await getPlayerForUser(req.user);
    if (!viewerPlayer) {
      return res.status(400).json({
        success: false,
        message: 'Viewer player profile not initialized.',
      });
    }

    // Evaluate backend authorization
    const isAuthorized = await canViewPlayerData(viewerPlayer._id, targetPlayer._id);

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: '🔒 This account is private. Connect with this player to view their cricket statistics.',
        privacyRestricted: true,
      });
    }

    // Attach target player and viewer player for convenience
    req.targetPlayer = targetPlayer;
    req.viewerPlayer = viewerPlayer;

    next();
  } catch (error) {
    next(error);
  }
};

export default checkConnectionMiddleware;
