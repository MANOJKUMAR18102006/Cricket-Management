import api from './api';

/**
 * Auth API Service
 */
export const authService = {
  // Register new user
  registerUser: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Log in user
  loginUser: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  // Get current logged-in user profile
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Update account information (username, email)
  updateAccount: async (accountData) => {
    const response = await api.put('/auth/me', accountData);
    return response.data;
  },

  // Change account password
  changePassword: async (passwordData) => {
    const response = await api.put('/auth/change-password', passwordData);
    return response.data;
  },
};

export default authService;
