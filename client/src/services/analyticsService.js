import api from './api';

export const analyticsService = {
  /**
   * Fetch cricket leaderboards across 8 categories with optional filters
   * params: { tournament, team, format, startDate, endDate, limit }
   */
  getLeaderboards: async (params = {}) => {
    const response = await api.get('/analytics/leaderboards', { params });
    return response.data;
  },

  /**
   * Fetch detailed player performance analytics and trends over time
   * params: { format, tournament, startDate, endDate }
   */
  getPlayerAnalytics: async (playerId, params = {}) => {
    const response = await api.get(`/analytics/players/${playerId}`, { params });
    return response.data;
  },
};

export default analyticsService;
