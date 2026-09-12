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

  // Get automatic player career statistics generated from match data
  // params: { format?: 'all' | 'T20' | 'T10' | 'ODI' }
  getPlayerStats: async (id, format = 'all') => {
    const params = {};
    if (format && format !== 'all' && format !== 'Overall') {
      params.format = format;
    }
    const response = await api.get(`/players/${id}/stats`, { params });
    return response.data;
  },

  // Get player match history (Strictly guarded by requirePlayerConnection)
  // params: { format, tournament, result, startDate, endDate }
  getPlayerMatches: async (id, params = {}) => {
    const cleanParams = {};
    Object.keys(params).forEach((k) => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '' && params[k] !== 'all') {
        cleanParams[k] = params[k];
      }
    });
    const response = await api.get(`/players/${id}/matches`, { params: cleanParams });
    return response.data;
  },

  // Compare two connected players across formats
  // params: { playerA, playerB, format }
  comparePlayers: async (params = {}) => {
    const cleanParams = {};
    Object.keys(params).forEach((k) => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        cleanParams[k] = params[k];
      }
    });
    const response = await api.get('/players/compare', { params: cleanParams });
    return response.data;
  },
};

export default playerService;
