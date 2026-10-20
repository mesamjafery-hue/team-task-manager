import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for consistent error extraction
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const customMessage = error.response?.data?.message || error.message || 'An unexpected error occurred.';
    error.formattedMessage = customMessage;
    return Promise.reject(error);
  }
);

// Authentication API methods
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  searchUsers: (query, teamId) => api.get('/auth/users/search', { params: { q: query, teamId } }),
};

// Team API methods
export const teamsApi = {
  list: () => api.get('/teams'),
  create: (data) => api.post('/teams', data),
  getDetails: (id) => api.get(`/teams/${id}`),
  update: (id, data) => api.patch(`/teams/${id}`, data),
  delete: (id) => api.delete(`/teams/${id}`),
  listMembers: (teamId) => api.get(`/teams/${teamId}/members`),
  addMember: (teamId, data) => api.post(`/teams/${teamId}/members`, data),
  removeMember: (teamId, userId) => api.delete(`/teams/${teamId}/members/${userId}`),
  inviteMember: (teamId, data) => api.post(`/teams/${teamId}/invite`, data),
};

// Task API methods
export const tasksApi = {
  list: (params) => api.get('/tasks', { params }),
  getStats: () => api.get('/tasks/dashboard/stats'),
  get: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.patch(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
};

export default api;
