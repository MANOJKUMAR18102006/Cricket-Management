import api from './api';

// Registry of listeners for future Socket.IO client updates
const socketListeners = new Set();

/**
 * Client Notification Service
 */
export const notificationService = {
  // Get notifications for current authenticated player
  getNotifications: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },

  // Get unread notification and pending request count
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  // Mark a notification as read
  markAsRead: async (id) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },

  // Socket.IO compatibility hook: register a listener for real-time notification pushes
  subscribeToNotifications: (callback) => {
    socketListeners.add(callback);
    return () => {
      socketListeners.delete(callback);
    };
  },

  // Internal trigger to dispatch incoming notifications to subscribers (e.g. from Socket.IO)
  emitNotification: (notification) => {
    socketListeners.forEach((listener) => {
      try {
        listener(notification);
      } catch (err) {
        console.warn('Notification listener error:', err);
      }
    });
  },
};

export default notificationService;
