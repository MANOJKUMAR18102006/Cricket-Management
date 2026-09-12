import api from './api';

const adminService = {
  // Stats overview
  getDashboardStats: async () => {
    const res = await api.get('/admin/stats');
    return res.data;
  },

  // Users management
  getUsers: async (params = {}) => {
    const res = await api.get('/admin/users', { params });
    return res.data;
  },

  updateUserStatus: async (id, status) => {
    const res = await api.put(`/admin/users/${id}/status`, { status });
    return res.data;
  },

  updateUserRole: async (id, role) => {
    const res = await api.put(`/admin/users/${id}/role`, { role });
    return res.data;
  },

  deleteUser: async (id) => {
    const res = await api.delete(`/admin/users/${id}`);
    return res.data;
  },

  // Players management
  getPlayers: async (params = {}) => {
    const res = await api.get('/admin/players', { params });
    return res.data;
  },

  deletePlayer: async (id) => {
    const res = await api.delete(`/admin/players/${id}`);
    return res.data;
  },

  // Teams management
  getTeams: async (params = {}) => {
    const res = await api.get('/admin/teams', { params });
    return res.data;
  },

  deleteTeam: async (id) => {
    const res = await api.delete(`/admin/teams/${id}`);
    return res.data;
  },

  // Matches management
  getMatches: async (params = {}) => {
    const res = await api.get('/admin/matches', { params });
    return res.data;
  },

  updateMatchStatus: async (id, status) => {
    const res = await api.put(`/admin/matches/${id}/status`, { status });
    return res.data;
  },

  deleteMatch: async (id) => {
    const res = await api.delete(`/admin/matches/${id}`);
    return res.data;
  },

  // Tournaments
  getTournaments: async () => {
    const res = await api.get('/admin/tournaments');
    return res.data;
  },
};

export default adminService;
