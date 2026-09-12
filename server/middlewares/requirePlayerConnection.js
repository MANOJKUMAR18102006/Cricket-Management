import mongoose from 'mongoose';
import Player from '../models/Player.js';
import { checkConnection, getPlayerForUser } from '../services/privacyService.js';

/**
 * Middleware: requirePlayerConnection
 * Strictly enforces connection privacy for cricket statistics and match performance data.
 * 
 * Flow:
 * authenticated user (req.user)
 *         ↓
 * requested player (req.params.id)
 *         ↓
 * is owner? → YES → next()
 *         ↓ NO
 * connection exists with status === 'accepted'?
 *         ↓
 * YES → next()
 * NO  → HTTP 403 Forbidden { success: false, message: "🔒 This player's cricket statistics are private. Connect with this player to view their statistics.", privacyRestricted: true }
 */
export const requirePlayerConnection = async (req, res, next) => {
  try {
    // 1. Validate requested player parameter
    const targetId = req.params.id || req.params.playerId;
    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid player ID format provided.',
      });
    }

    // 2. Resolve target player
    let targetPlayer = await Player.findById(targetId);
    if (!targetPlayer) {
      targetPlayer = await Player.findOne({ userId: targetId });
    }

    if (!targetPlayer) {
      return res.status(404).json({
        success: false,
        message: 'Requested player profile not found.',
      });
    }

    // 3. Public profile check: Anyone (including unauthenticated guests) can view public player data
    if (targetPlayer.profileVisibility === 'public') {
      req.targetPlayer = targetPlayer;
      req.isOwner = false;
      return next();
    }

    // 4. Private account: If viewer is unauthenticated guest
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: "🔒 This player's detailed cricket statistics are only visible to accepted connections.",
        privacyRestricted: true,
      });
    }

    // 5. Resolve viewer's player record
    const viewerPlayer = await getPlayerForUser(req.user);
    if (!viewerPlayer) {
      return res.status(403).json({
        success: false,
        message: "🔒 This player's detailed cricket statistics are only visible to accepted connections.",
        privacyRestricted: true,
      });
    }

    // 6. Owner check: Player can always view their own data
    const isOwner =
      String(viewerPlayer._id) === String(targetPlayer._id) ||
      (targetPlayer.userId && String(targetPlayer.userId) === String(req.user._id));

    if (isOwner) {
      req.targetPlayer = targetPlayer;
      req.viewerPlayer = viewerPlayer;
      req.isOwner = true;
      return next();
    }

    // 7. Check if connection exists with status === 'accepted'
    const connection = await checkConnection(viewerPlayer._id, targetPlayer._id);

    if (connection && connection.status === 'accepted') {
      req.targetPlayer = targetPlayer;
      req.viewerPlayer = viewerPlayer;
      req.isOwner = false;
      return next();
    }

    // 8. Authenticated but not connected -> Reject with HTTP 403
    return res.status(403).json({
      success: false,
      message: "🔒 This player's cricket statistics are private. Connect with this player to view their statistics.",
      privacyRestricted: true,
    });
  } catch (error) {
    console.error('requirePlayerConnection error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error verifying player connection privacy.',
    });
  }
};

export default requirePlayerConnection;
