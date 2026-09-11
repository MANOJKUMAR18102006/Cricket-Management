import api from './api';

/**
 * Player Connection Service
 */
export const connectionService = {
  // Send a connection request to target player
  sendRequest: async (playerId) => {
    const response = await api.post(`/connections/request/${playerId}`);
    return response.data;
  },

  // Get received pending connection requests
  getReceivedRequests: async () => {
    const response = await api.get('/connections/requests');
    return response.data;
  },

  // Get sent pending connection requests
  getSentRequests: async () => {
    const response = await api.get('/connections/sent');
    return response.data;
  },

  // Accept a received connection request
  acceptRequest: async (id) => {
    const response = await api.put(`/connections/${id}/accept`);
    return response.data;
  },

  // Reject a received connection request
  rejectRequest: async (id) => {
    const response = await api.put(`/connections/${id}/reject`);
    return response.data;
  },

  // Remove an existing connection
  removeConnection: async (id) => {
    const response = await api.delete(`/connections/${id}`);
    return response.data;
  },

  // Get all accepted connections
  getConnections: async () => {
    const response = await api.get('/connections');
    return response.data;
  },

  // Get connection relationship status with target player
  getStatus: async (playerId) => {
    const response = await api.get(`/connections/status/${playerId}`);
    return response.data;
  },
};

export default connectionService;
