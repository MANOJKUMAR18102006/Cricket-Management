import axios from 'axios';

// Base API configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor (ready for JWT token attachment in future)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('crickpulse_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Standard error logging / interceptor hooks
    console.error('[API Error]:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Health check service
export const checkApiHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;
