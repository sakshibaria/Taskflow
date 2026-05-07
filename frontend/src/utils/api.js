// src/utils/api.js
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Refresh token on 401
let refreshPromise = null;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !original._retry) {
      original._retry = true;
      if (!refreshPromise) {
        const refreshToken = localStorage.getItem('refreshToken');
        refreshPromise = axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
          .then(res => {
            localStorage.setItem('accessToken', res.data.accessToken);
            localStorage.setItem('refreshToken', res.data.refreshToken);
            return res.data.accessToken;
          })
          .catch(() => {
            localStorage.clear();
            window.location.href = '/login';
          })
          .finally(() => { refreshPromise = null; });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/profile', data),
};

// Projects
export const projectsAPI = {
  list: () => api.get('/projects'),
  create: (data) => api.post('/projects', data),
  getById: (id) => api.get(`/projects/${id}`),
  update: (id, data) => api.patch(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  addMember: (id, data) => api.post(`/projects/${id}/members`, data),
  removeMember: (id, userId) => api.delete(`/projects/${id}/members/${userId}`),
  updateMemberRole: (id, userId, role) => api.patch(`/projects/${id}/members/${userId}/role`, { role }),
  getActivity: (id) => api.get(`/projects/${id}/activity`),
  getTasks: (id, params) => api.get(`/projects/${id}/tasks`, { params }),
  createTask: (id, data) => api.post(`/projects/${id}/tasks`, data),
};

// Tasks
export const tasksAPI = {
  getMyTasks: (params) => api.get('/tasks/my', { params }),
  getDashboard: () => api.get('/tasks/dashboard'),
  getById: (id) => api.get(`/tasks/${id}`),
  update: (id, data) => api.patch(`/tasks/${id}`, data),
  updateStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  delete: (id) => api.delete(`/tasks/${id}`),
  addComment: (id, content) => api.post(`/tasks/${id}/comments`, { content }),
  getNotifications: () => api.get('/tasks/notifications'),
  markNotificationsRead: () => api.post('/tasks/notifications/read'),
};

// Users
export const usersAPI = {
  search: (q) => api.get('/users/search', { params: { q } }),
};

export default api;
