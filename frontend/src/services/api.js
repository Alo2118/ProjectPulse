import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
};

// Projects
export const projectsApi = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
};

// Tasks
export const tasksApi = {
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  getDailyReport: (params) => api.get('/tasks/daily-report', { params }),
};

// Time entries
export const timeApi = {
  start: (task_id) => api.post('/time/start', { task_id }),
  stop: (id) => api.post(`/time/${id}/stop`),
  getActive: () => api.get('/time/active'),
  getEntries: (params) => api.get('/time', { params }),
};

// Comments
export const commentsApi = {
  getByTask: (task_id) => api.get('/comments', { params: { task_id } }),
  create: (data) => api.post('/comments', data),
  delete: (id) => api.delete(`/comments/${id}`),
};

// Milestones
export const milestonesApi = {
  getByProject: (project_id) => api.get('/milestones', { params: { project_id } }),
  getById: (id) => api.get(`/milestones/${id}`),
  create: (data) => api.post('/milestones', data),
  update: (id, data) => api.put(`/milestones/${id}`, data),
  delete: (id) => api.delete(`/milestones/${id}`),
  complete: (id) => api.post(`/milestones/${id}/complete`),
};

export default api;
