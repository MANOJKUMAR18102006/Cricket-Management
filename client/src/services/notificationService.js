import api from './api';

/**
 * Notification Service
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
    const response = await api.put('/notifications/mark-all-read');
    return response.data;
  },
};

export default notificationService;
