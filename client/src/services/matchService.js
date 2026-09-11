import api from './api';

/**
 * Cricket Match Management Service
 */
export const matchService = {
  // Get all matches with optional query filters (status, format, search, page, limit)
  getMatches: async (params = {}) => {
    const response = await api.get('/matches', { params });
    return response.data;
  },

  // Get single match details by ID
  getMatchById: async (id) => {
    const response = await api.get(`/matches/${id}`);
    return response.data;
  },

  // Create a new match (Protected)
  createMatch: async (matchData) => {
    const response = await api.post('/matches', matchData);
    return response.data;
  },

  // Update match info, status, toss, or result (Protected - Creator / Admin)
  updateMatch: async (id, matchData) => {
    const response = await api.put(`/matches/${id}`, matchData);
    return response.data;
  },

  // Delete a match (Protected - Creator / Admin)
  deleteMatch: async (id) => {
    const response = await api.delete(`/matches/${id}`);
    return response.data;
  },
};

export default matchService;
