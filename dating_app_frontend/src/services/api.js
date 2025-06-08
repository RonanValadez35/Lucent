import axios from 'axios';

// Create an axios instance with defaults
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
  headers: {
    'Content-Type': 'application/json',
  },
  // Increase timeout for larger requests
  timeout: 30000, // 30 seconds
  // Increase max content length
  maxContentLength: 10000000, // 10MB
});

// Interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Special handling for profile updates (which might contain large images)
    if (config.url === '/api/profiles/' && config.method === 'put') {
      // Increase timeout specifically for profile updates
      config.timeout = 60000; // 60 seconds
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle token expiry
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired, clear local storage
      localStorage.removeItem('authToken');
      
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  register: (userData) => api.post('/api/auth/register', userData),
  login: (credentials) => api.post('/api/auth/login', credentials),
  getCurrentUser: () => api.get('/api/auth/me'),
};

// Profiles API
export const profilesAPI = {
  getProfile: () => api.get('/api/profiles/'),
  updateProfile: (data) => api.put('/api/profiles/', data),
  discoverProfiles: () => api.get('/api/profiles/discover'),
  getUserProfile: (uid) => api.get(`/api/profiles/${uid}`),
};

// Matches API
export const matchesAPI = {
  likeProfile: (uid) => api.post(`/api/matches/like/${uid}`),
  dislikeProfile: (uid) => api.post(`/api/matches/dislike/${uid}`),
  getMatches: () => api.get('/api/matches/matches'),
  unmatch: (matchId) => api.post(`/api/matches/unmatch/${matchId}`),
  clearAllLikes: () => api.post('/api/matches/clear-likes'),
};

// Messages API
export const messagesAPI = {
  getMessages: (matchId) => api.get(`/api/messages/${matchId}`),
  sendMessage: (matchId, content) => api.post(`/api/messages/${matchId}`, { content }),
  getUnreadCount: (matchId) => api.get(`/api/messages/${matchId}/unread`),
  getConversations: () => api.get('/api/messages/conversations'),
};

// Ratings API
export const ratingsAPI = {
  getUserRatings: (userId) => api.get(`/api/ratings/${userId}`),
  getMyRating: (userId) => api.get(`/api/ratings/my/${userId}`),
  submitRating: (data) => api.post('/api/ratings', data),
  updateRating: (ratingId, data) => api.put(`/api/ratings/${ratingId}`, data),
  deleteRating: (ratingId) => api.delete(`/api/ratings/${ratingId}`),
  clearAllRatings: () => api.post('/api/ratings/clear-all')
}; 