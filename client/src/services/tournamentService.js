import api from './api';

/**
 * Tournament Management API Service
 */
export const tournamentService = {
  // Get all tournaments with filters (search, status, format, city, pagination)
  getTournaments: async (params = {}) => {
    const response = await api.get('/tournaments', { params });
    return response.data;
  },

  // Get tournaments where user is organizer or team participant (Protected)
  getMyTournaments: async (params = {}) => {
    const response = await api.get('/tournaments/my', { params });
    return response.data;
  },

  // Get tournament details by ID
  getTournamentById: async (id) => {
    const response = await api.get(`/tournaments/${id}`);
    return response.data;
  },

  // Create a new tournament (Protected)
  createTournament: async (tournamentData) => {
    const response = await api.post('/tournaments', tournamentData);
    return response.data;
  },

  // Update tournament (Protected - Organizer only)
  updateTournament: async (id, tournamentData) => {
    const response = await api.put(`/tournaments/${id}`, tournamentData);
    return response.data;
  },

  // Delete / cancel tournament (Protected - Organizer only)
  deleteTournament: async (id) => {
    const response = await api.delete(`/tournaments/${id}`);
    return response.data;
  },

  // Send tournament invitation to a team (Protected - Organizer only)
  sendTournamentInvitation: async (tournamentId, { teamId, message }) => {
    const response = await api.post(`/tournaments/${tournamentId}/invitations`, { teamId, message });
    return response.data;
  },

  // Get sent invitations for a tournament (Protected - Organizer only)
  getTournamentInvitations: async (tournamentId) => {
    const response = await api.get(`/tournaments/${tournamentId}/invitations`);
    return response.data;
  },

  // Get pending tournament invitations for current player's teams (Protected - Captain only)
  getReceivedTournamentInvitations: async () => {
    const response = await api.get('/tournament-invitations/received');
    return response.data;
  },

  // Accept tournament invitation (Protected - Captain only)
  acceptTournamentInvitation: async (invitationId) => {
    const response = await api.put(`/tournament-invitations/${invitationId}/accept`);
    return response.data;
  },

  // Decline tournament invitation (Protected - Captain only)
  rejectTournamentInvitation: async (invitationId) => {
    const response = await api.put(`/tournament-invitations/${invitationId}/reject`);
    return response.data;
  },

  // Cancel tournament invitation (Protected - Organizer only)
  cancelTournamentInvitation: async (invitationId) => {
    const response = await api.delete(`/tournament-invitations/${invitationId}`);
    return response.data;
  },

  // Create tournament fixture (Protected - Organizer only)
  createTournamentFixture: async (tournamentId, fixtureData) => {
    const response = await api.post(`/tournaments/${tournamentId}/matches`, fixtureData);
    return response.data;
  },

  // Get all matches for a tournament
  getTournamentMatches: async (tournamentId) => {
    const response = await api.get(`/tournaments/${tournamentId}/matches`);
    return response.data;
  },

  // Get dynamic points table and NRR standings
  getTournamentPointsTable: async (tournamentId) => {
    const response = await api.get(`/tournaments/${tournamentId}/points-table`);
    return response.data;
  },

  // Get tournament specific player leaderboard
  getTournamentLeaderboard: async (tournamentId) => {
    const response = await api.get(`/tournaments/${tournamentId}/leaderboard`);
    return response.data;
  },
};

export default tournamentService;
