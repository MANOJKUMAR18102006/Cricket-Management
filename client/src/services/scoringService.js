import api from './api';

/**
 * Ball-by-Ball Cricket Scoring API Service
 */
export const scoringService = {
  // Get current match scoring state, innings, deliveries, and scorecard
  getMatchScoringState: async (matchId) => {
    const response = await api.get(`/scoring/${matchId}`);
    return response.data;
  },

  // Start an innings (1 or 2) with openers and opening bowler
  startInnings: async (matchId, payload) => {
    const response = await api.post(`/scoring/${matchId}/start-innings`, payload);
    return response.data;
  },

  // Record a delivery (runs, wide, no_ball, bye, leg_bye, wicket)
  recordDelivery: async (matchId, deliveryData) => {
    const response = await api.post(`/scoring/${matchId}/delivery`, deliveryData);
    return response.data;
  },

  // Undo the last delivery
  undoDelivery: async (matchId) => {
    const response = await api.post(`/scoring/${matchId}/undo`);
    return response.data;
  },

  // Manually swap striker and non-striker
  changeStriker: async (matchId) => {
    const response = await api.post(`/scoring/${matchId}/change-striker`);
    return response.data;
  },

  // Complete an over and set new bowler
  endOver: async (matchId, payload) => {
    const response = await api.post(`/scoring/${matchId}/end-over`, payload);
    return response.data;
  },

  // End current innings and set target for next innings
  endInnings: async (matchId, inningsNumber = null) => {
    const response = await api.post(`/scoring/${matchId}/end-innings`, { inningsNumber });
    return response.data;
  },

  // Complete match with winner declaration and result
  // Get match squads (registered members + confirmed playing XI)
  getMatchSquad: async (matchId) => {
    const response = await api.get(`/matches/${matchId}/squad`);
    return response.data;
  },

  // Confirm Playing XI for team1 or team2
  setPlayingXI: async (matchId, team, playerIds) => {
    const response = await api.post(`/matches/${matchId}/playing-xi`, { team, playerIds });
    return response.data;
  },

  // Set active bowler (with consecutive over and max over validation)
  setBowler: async (matchId, bowler, bowlerId = null) => {
    const payload = typeof bowler === 'object' ? bowler : { bowler, bowlerId };
    const response = await api.put(`/matches/${matchId}/bowler`, payload);
    return response.data;
  },

  // Set active striker
  setStriker: async (matchId, striker, strikerId = null) => {
    const payload = typeof striker === 'object' ? striker : { striker, strikerId };
    const response = await api.put(`/matches/${matchId}/striker`, payload);
    return response.data;
  },

  // Set active non-striker
  setNonStriker: async (matchId, nonStriker, nonStrikerId = null) => {
    const payload = typeof nonStriker === 'object' ? nonStriker : { nonStriker, nonStrikerId };
    const response = await api.put(`/matches/${matchId}/non-striker`, payload);
    return response.data;
  },

  // Get full scorecard
  getScorecard: async (matchId) => {
    const response = await api.get(`/matches/${matchId}/scorecard`);
    return response.data;
  },
};

export default scoringService;
