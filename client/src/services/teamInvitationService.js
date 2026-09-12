import api from './api';

/**
 * Team Recruitment & Player Invitation Service
 */
export const teamInvitationService = {
  // Send invitation to a player for a team (Captain only)
  sendInvitation: async (teamId, { playerId, message }) => {
    const response = await api.post(`/teams/${teamId}/invitations`, { playerId, message });
    return response.data;
  },

  // Get all invitations sent for a team (Captain only)
  getTeamInvitations: async (teamId) => {
    const response = await api.get(`/teams/${teamId}/invitations`);
    return response.data;
  },

  // Get all pending invitations received by current player
  getReceivedInvitations: async () => {
    const response = await api.get('/team-invitations/received');
    return response.data;
  },

  // Accept team invitation
  acceptInvitation: async (invitationId) => {
    const response = await api.put(`/team-invitations/${invitationId}/accept`);
    return response.data;
  },

  // Reject team invitation
  rejectInvitation: async (invitationId) => {
    const response = await api.put(`/team-invitations/${invitationId}/reject`);
    return response.data;
  },

  // Cancel team invitation (Captain/Inviter only)
  cancelInvitation: async (invitationId) => {
    const response = await api.delete(`/team-invitations/${invitationId}`);
    return response.data;
  },
};

export default teamInvitationService;
