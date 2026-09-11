import Player from '../models/Player.js';
import Connection from '../models/Connection.js';

/**
 * Check if two players have an accepted connection
 * @param {string|mongoose.Types.ObjectId} playerAId
 * @param {string|mongoose.Types.ObjectId} playerBId
 * @returns {Promise<Connection|null>}
 */
export const checkConnection = async (playerAId, playerBId) => {
  if (!playerAId || !playerBId) return null;

  return await Connection.findOne({
    status: 'accepted',
    $or: [
      { requester: playerAId, receiver: playerBId },
      { requester: playerBId, receiver: playerAId },
    ],
  });
};

/**
 * Comprehensive Backend Authorization Logic:
 * Determines if a viewer player is authorized to view a target player's detailed cricket statistics.
 * 
 * Rules:
 * 1. Owner Access: Same player -> ALWAYS TRUE
 * 2. Public Account: Target profileVisibility === 'public' -> TRUE
 * 3. Private Account: Accepted connection exists -> TRUE
 * 4. Otherwise -> FALSE
 *
 * @param {string|mongoose.Types.ObjectId|null} viewerPlayerId
 * @param {string|mongoose.Types.ObjectId} targetPlayerId
 * @returns {Promise<boolean>}
 */
export const canViewPlayerData = async (viewerPlayerId, targetPlayerId) => {
  if (!targetPlayerId) return false;

  // 1. Owner access: A player can always view their own data
  if (viewerPlayerId && String(viewerPlayerId) === String(targetPlayerId)) {
    return true;
  }

  // Fetch target player's privacy setting
  const targetPlayer = await Player.findById(targetPlayerId).select('profileVisibility');
  if (!targetPlayer) return false;

  // 2. Public profile: Any authenticated player can view detailed stats
  if (targetPlayer.profileVisibility === 'public') {
    return true;
  }

  // 3. Private profile: Requires an accepted connection
  if (!viewerPlayerId) {
    return false;
  }

  const acceptedConnection = await checkConnection(viewerPlayerId, targetPlayerId);
  return !!acceptedConnection;
};

/**
 * Get the relationship status between two players
 * @param {string|mongoose.Types.ObjectId} viewerPlayerId
 * @param {string|mongoose.Types.ObjectId} targetPlayerId
 * @returns {Promise<{ status: string, connectionId?: string }>}
 */
export const getConnectionStatus = async (viewerPlayerId, targetPlayerId) => {
  if (!viewerPlayerId || !targetPlayerId) {
    return { status: 'none' };
  }

  if (String(viewerPlayerId) === String(targetPlayerId)) {
    return { status: 'self' };
  }

  const connection = await Connection.findOne({
    $or: [
      { requester: viewerPlayerId, receiver: targetPlayerId },
      { requester: targetPlayerId, receiver: viewerPlayerId },
    ],
  });

  if (!connection) {
    return { status: 'none' };
  }

  if (connection.status === 'accepted') {
    return { status: 'connected', connectionId: connection._id };
  }

  if (connection.status === 'pending') {
    if (String(connection.requester) === String(viewerPlayerId)) {
      return { status: 'pending_sent', connectionId: connection._id };
    } else {
      return { status: 'pending_received', connectionId: connection._id };
    }
  }

  return { status: connection.status, connectionId: connection._id };
};

/**
 * Helper to resolve player record for authenticated req.user
 * @param {Object} user User document
 * @returns {Promise<Player>}
 */
export const getPlayerForUser = async (user) => {
  if (!user || !user._id) return null;
  let player = await Player.findOne({ userId: user._id });
  if (!player) {
    // Auto-create default player profile if none exists yet
    player = await Player.create({
      userId: user._id,
      displayName: user.username,
      profileImage: user.profileImage || '',
      city: user.city || '',
      bio: user.bio || '',
      playingRole: 'Batter',
      profileVisibility: 'private',
    });
  }
  return player;
};

export default {
  checkConnection,
  canViewPlayerData,
  getConnectionStatus,
  getPlayerForUser,
};
