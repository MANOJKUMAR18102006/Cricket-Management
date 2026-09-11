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
  endInnings: async (matchId) => {
    const response = await api.post(`/scoring/${matchId}/end-innings`);
    return response.data;
  },

  // Complete match with winner declaration and result
  completeMatch: async (matchId, payload) => {
    const response = await api.post(`/scoring/${matchId}/complete-match`, payload);
    return response.data;
  },
};

export default scoringService;
