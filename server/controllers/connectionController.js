import mongoose from 'mongoose';
import Connection from '../models/Connection.js';
import Player from '../models/Player.js';
import Notification from '../models/Notification.js';
import { getPlayerForUser, getConnectionStatus } from '../services/privacyService.js';

/**
 * @route   POST /api/connections/request/:playerId
 * @desc    Send a connection request to another player
 * @access  Private
 */
export const sendConnectionRequest = async (req, res, next) => {
  try {
    const { playerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target player ID format.',
      });
    }

    const viewerPlayer = await getPlayerForUser(req.user);
    if (!viewerPlayer) {
      return res.status(400).json({
        success: false,
        message: 'Please complete your player profile before sending connection requests.',
      });
    }

    // Prevent connecting with yourself
    if (String(viewerPlayer._id) === String(playerId)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot send a connection request to yourself.',
      });
    }

    // Verify target player exists
    const targetPlayer = await Player.findById(playerId);
    if (!targetPlayer) {
      return res.status(404).json({
        success: false,
        message: 'Target player not found.',
      });
    }

    // Check existing relationship in either direction
    let existingConnection = await Connection.findOne({
      $or: [
        { requester: viewerPlayer._id, receiver: targetPlayer._id },
        { requester: targetPlayer._id, receiver: viewerPlayer._id },
      ],
    });

    if (existingConnection) {
      if (existingConnection.status === 'accepted') {
        return res.status(400).json({
          success: false,
          message: 'An accepted connection already exists with this player.',
        });
      }

      if (existingConnection.status === 'pending') {
        if (String(existingConnection.requester) === String(viewerPlayer._id)) {
          return res.status(400).json({
            success: false,
            message: 'A connection request has already been sent to this player.',
          });
        } else {
          return res.status(400).json({
            success: false,
            message: 'This player has already sent you a connection request. Please accept it from your requests.',
          });
        }
      }

      if (existingConnection.status === 'blocked') {
        return res.status(403).json({
          success: false,
          message: 'Unable to connect with this player.',
        });
      }

      // If rejected, update the existing connection to pending with new requester
      existingConnection.requester = viewerPlayer._id;
      existingConnection.receiver = targetPlayer._id;
      existingConnection.status = 'pending';
      await existingConnection.save();

      // Create notification
      await Notification.create({
        recipient: targetPlayer._id,
        sender: viewerPlayer._id,
        type: 'connection_request',
        message: `${viewerPlayer.displayName} sent you a connection request.`,
        connectionId: existingConnection._id,
      });

      return res.status(201).json({
        success: true,
        message: 'Connection request sent successfully.',
        connection: existingConnection,
      });
    }

    // Create new pending connection
    const connection = await Connection.create({
      requester: viewerPlayer._id,
      receiver: targetPlayer._id,
      status: 'pending',
    });

    // Create notification for target player
    await Notification.create({
      recipient: targetPlayer._id,
      sender: viewerPlayer._id,
      type: 'connection_request',
      message: `${viewerPlayer.displayName} sent you a connection request.`,
      connectionId: connection._id,
    });

    res.status(201).json({
      success: true,
      message: 'Connection request sent successfully.',
      connection,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/connections/requests
 * @desc    Get received pending connection requests for the authenticated player
 * @access  Private
 */
export const getReceivedRequests = async (req, res, next) => {
  try {
    const viewerPlayer = await getPlayerForUser(req.user);
    if (!viewerPlayer) {
      return res.status(200).json({ success: true, count: 0, requests: [] });
    }

    const requests = await Connection.find({
      receiver: viewerPlayer._id,
      status: 'pending',
    })
      .populate({
        path: 'requester',
        select: 'displayName profileImage playingRole currentTeam city bio jerseyNumber userId',
        populate: { path: 'userId', select: 'username' },
      })
      .sort({ createdAt: -1 });

    const formattedRequests = requests.map((reqItem) => ({
      _id: reqItem._id,
      status: reqItem.status,
      createdAt: reqItem.createdAt,
      player: reqItem.requester
        ? {
            _id: reqItem.requester._id,
            displayName: reqItem.requester.displayName,
            username: reqItem.requester.userId?.username || 'cricketer',
            profileImage: reqItem.requester.profileImage,
            playingRole: reqItem.requester.playingRole,
            currentTeam: reqItem.requester.currentTeam,
            city: reqItem.requester.city,
            bio: reqItem.requester.bio,
            jerseyNumber: reqItem.requester.jerseyNumber,
          }
        : null,
    }));

    res.status(200).json({
      success: true,
      count: formattedRequests.length,
      requests: formattedRequests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/connections/sent
 * @desc    Get sent pending connection requests sent by the authenticated player
 * @access  Private
 */
export const getSentRequests = async (req, res, next) => {
  try {
    const viewerPlayer = await getPlayerForUser(req.user);
    if (!viewerPlayer) {
      return res.status(200).json({ success: true, count: 0, requests: [] });
    }

    const requests = await Connection.find({
      requester: viewerPlayer._id,
      status: 'pending',
    })
      .populate({
        path: 'receiver',
        select: 'displayName profileImage playingRole currentTeam city bio jerseyNumber userId',
        populate: { path: 'userId', select: 'username' },
      })
      .sort({ createdAt: -1 });

    const formattedRequests = requests.map((reqItem) => ({
      _id: reqItem._id,
      status: reqItem.status,
      createdAt: reqItem.createdAt,
      player: reqItem.receiver
        ? {
            _id: reqItem.receiver._id,
            displayName: reqItem.receiver.displayName,
            username: reqItem.receiver.userId?.username || 'cricketer',
            profileImage: reqItem.receiver.profileImage,
            playingRole: reqItem.receiver.playingRole,
            currentTeam: reqItem.receiver.currentTeam,
            city: reqItem.receiver.city,
            bio: reqItem.receiver.bio,
            jerseyNumber: reqItem.receiver.jerseyNumber,
          }
        : null,
    }));

    res.status(200).json({
      success: true,
      count: formattedRequests.length,
      requests: formattedRequests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/connections/:id/accept
 * @desc    Accept a connection request (Only the receiver can accept)
 * @access  Private
 */
export const acceptConnectionRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid connection ID format.',
      });
    }

    const viewerPlayer = await getPlayerForUser(req.user);
    const connection = await Connection.findById(id);

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Connection request not found.',
      });
    }

    // Only the RECEIVER should be allowed to accept it
    if (String(connection.receiver) !== String(viewerPlayer._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only the recipient of this connection request can accept it.',
      });
    }

    if (connection.status === 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Connection request is already accepted.',
      });
    }

    connection.status = 'accepted';
    await connection.save();

    // Create notification for the requester
    await Notification.create({
      recipient: connection.requester,
      sender: viewerPlayer._id,
      type: 'connection_accepted',
      message: `${viewerPlayer.displayName} accepted your connection request. You can now view each other's statistics.`,
      connectionId: connection._id,
    });

    res.status(200).json({
      success: true,
      message: 'Connection request accepted successfully.',
      connection,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/connections/:id/reject
 * @desc    Reject a connection request (Only the receiver can reject)
 * @access  Private
 */
export const rejectConnectionRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid connection ID format.',
      });
    }

    const viewerPlayer = await getPlayerForUser(req.user);
    const connection = await Connection.findById(id);

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Connection request not found.',
      });
    }

    // Only the RECEIVER should be allowed to reject it
    if (String(connection.receiver) !== String(viewerPlayer._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only the recipient of this connection request can reject it.',
      });
    }

    connection.status = 'rejected';
    await connection.save();

    // Create notification for requester
    await Notification.create({
      recipient: connection.requester,
      sender: viewerPlayer._id,
      type: 'connection_rejected',
      message: `${viewerPlayer.displayName} declined your connection request.`,
      connectionId: connection._id,
    });

    res.status(200).json({
      success: true,
      message: 'Connection request rejected.',
      connection,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/connections/:id
 * @desc    Remove an existing connection (Only participants can remove)
 * @access  Private
 */
export const removeConnection = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid connection ID format.',
      });
    }

    const viewerPlayer = await getPlayerForUser(req.user);
    const connection = await Connection.findById(id);

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Connection not found.',
      });
    }

    // Only participants can remove
    const isParticipant =
      String(connection.requester) === String(viewerPlayer._id) ||
      String(connection.receiver) === String(viewerPlayer._id);

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to remove this connection.',
      });
    }

    await Connection.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Connection removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/connections
 * @desc    Get the authenticated player's accepted connections
 * @access  Private
 */
export const getAcceptedConnections = async (req, res, next) => {
  try {
    const viewerPlayer = await getPlayerForUser(req.user);
    if (!viewerPlayer) {
      return res.status(200).json({ success: true, count: 0, connections: [] });
    }

    const connections = await Connection.find({
      status: 'accepted',
      $or: [{ requester: viewerPlayer._id }, { receiver: viewerPlayer._id }],
    })
      .populate({
        path: 'requester',
        select: 'displayName profileImage playingRole currentTeam city bio jerseyNumber profileVisibility userId',
        populate: { path: 'userId', select: 'username' },
      })
      .populate({
        path: 'receiver',
        select: 'displayName profileImage playingRole currentTeam city bio jerseyNumber profileVisibility userId',
        populate: { path: 'userId', select: 'username' },
      })
      .sort({ updatedAt: -1 });

    const formatted = connections.map((conn) => {
      const isRequester = String(conn.requester._id) === String(viewerPlayer._id);
      const otherPlayer = isRequester ? conn.receiver : conn.requester;

      return {
        _id: conn._id,
        connectedAt: conn.updatedAt,
        status: conn.status,
        player: otherPlayer
          ? {
              _id: otherPlayer._id,
              displayName: otherPlayer.displayName,
              username: otherPlayer.userId?.username || 'cricketer',
              profileImage: otherPlayer.profileImage,
              playingRole: otherPlayer.playingRole,
              currentTeam: otherPlayer.currentTeam,
              city: otherPlayer.city,
              bio: otherPlayer.bio,
              jerseyNumber: otherPlayer.jerseyNumber,
              profileVisibility: otherPlayer.profileVisibility,
            }
          : null,
      };
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      connections: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/connections/status/:playerId
 * @desc    Get relationship status between authenticated player and target player
 * @access  Private
 */
export const getPlayerConnectionStatus = async (req, res, next) => {
  try {
    const { playerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(playerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid player ID format.',
      });
    }

    const viewerPlayer = await getPlayerForUser(req.user);
    const result = await getConnectionStatus(viewerPlayer._id, playerId);

    res.status(200).json({
      success: true,
      status: result.status,
      connectionId: result.connectionId || null,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  sendConnectionRequest,
  getReceivedRequests,
  getSentRequests,
  acceptConnectionRequest,
  rejectConnectionRequest,
  removeConnection,
  getAcceptedConnections,
  getPlayerConnectionStatus,
};
