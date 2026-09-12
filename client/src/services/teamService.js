import api from './api';

/**
 * Team Management API Service
 */
export const teamService = {
  // Get all teams with search, city filter, and pagination
  getTeams: async (params = {}) => {
    const response = await api.get('/teams', { params });
    return response.data;
  },

  // Get teams where authenticated user is a member/captain (Protected)
  getMyTeams: async (params = {}) => {
    const response = await api.get('/teams/my', { params });
    return response.data;
  },

  // Get single team profile with members and match statistics
  getTeamById: async (id) => {
    const response = await api.get(`/teams/${id}`);
    return response.data;
  },

  // Create a new team (Protected)
  createTeam: async (teamData) => {
    const response = await api.post('/teams', teamData);
    return response.data;
  },

  // Update team metadata, captain, or viceCaptain (Protected - Creator / Captain / Admin)
  updateTeam: async (id, teamData) => {
    const response = await api.put(`/teams/${id}`, teamData);
    return response.data;
  },

  // Delete a team (Protected - Creator / Admin)
  deleteTeam: async (id) => {
    const response = await api.delete(`/teams/${id}`);
    return response.data;
  },

  // Add a player to the team squad (Protected - Creator / Captain / Admin)
  addMember: async (teamId, playerId) => {
    const response = await api.post(`/teams/${teamId}/members/${playerId}`);
    return response.data;
  },

  // Remove a player from the team squad (Protected - Creator / Captain / Admin / Self)
  removeMember: async (teamId, playerId) => {
    const response = await api.delete(`/teams/${teamId}/members/${playerId}`);
    return response.data;
  },
};

export default teamService;
