import api from './api';

/**
 * Player Profile Service
 */
export const playerService = {
  // Create player profile for authenticated user
  createPlayer: async (playerData) => {
    const response = await api.post('/players', playerData);
    return response.data;
  },

  // Get current authenticated user's player profile
  getMyPlayer: async () => {
    const response = await api.get('/players/me');
    return response.data;
  },

  // Update current authenticated user's player profile
  updateMyPlayer: async (playerData) => {
    const response = await api.put('/players/me', playerData);
    return response.data;
  },

  // Get public player profile by ID
  getPlayerById: async (id) => {
    const response = await api.get(`/players/${id}`);
    return response.data;
  },

  // Search and discover players with filters & pagination
  // params: { search, team, city, role, page, limit }
  searchPlayers: async (params = {}) => {
    const response = await api.get('/players', { params });
    return response.data;
  },

  // Update account privacy setting: 'public' | 'private'
  updatePrivacy: async (profileVisibility) => {
    const response = await api.put('/players/me/privacy', { profileVisibility });
    return response.data;
  },
};

export default playerService;
