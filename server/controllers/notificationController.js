import Notification from '../models/Notification.js';
import Connection from '../models/Connection.js';
import { getPlayerForUser } from '../services/privacyService.js';

/**
 * @route   GET /api/notifications
 * @desc    Get notifications for the authenticated player
 * @access  Private
 */
export const getNotifications = async (req, res, next) => {
  try {
    const viewerPlayer = await getPlayerForUser(req.user);
    if (!viewerPlayer) {
      return res.status(200).json({ success: true, count: 0, notifications: [] });
    }

    const notifications = await Notification.find({ recipient: viewerPlayer._id })
      .populate({
        path: 'sender',
        select: 'displayName profileImage playingRole currentTeam city',
      })
      .sort({ createdAt: -1 })
      .limit(30);

    res.status(200).json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications and pending received requests
 * @access  Private
 */
export const getUnreadCount = async (req, res, next) => {
  try {
    const viewerPlayer = await getPlayerForUser(req.user);
    if (!viewerPlayer) {
      return res.status(200).json({ success: true, unreadCount: 0, pendingRequestsCount: 0 });
    }

    const [unreadNotifications, pendingRequests] = await Promise.all([
      Notification.countDocuments({ recipient: viewerPlayer._id, isRead: false }),
      Connection.countDocuments({ receiver: viewerPlayer._id, status: 'pending' }),
    ]);

    res.status(200).json({
      success: true,
      unreadCount: unreadNotifications,
      pendingRequestsCount: pendingRequests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Private
 */
export const markAsRead = async (req, res, next) => {
  try {
    const viewerPlayer = await getPlayerForUser(req.user);
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: viewerPlayer._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/notifications/mark-all-read
 * @desc    Mark all notifications for player as read
 * @access  Private
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    const viewerPlayer = await getPlayerForUser(req.user);
    await Notification.updateMany(
      { recipient: viewerPlayer._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
