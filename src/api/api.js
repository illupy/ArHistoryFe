import axios from 'axios';

const API_BASE = 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ar_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401/403 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('ar_token');
      localStorage.removeItem('ar_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ========== Auth ==========
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getUsers: () => api.get('/auth/users'),
};

// ========== Dashboard ==========
export const dashboardApi = {
  getStats: () => api.get('/api/dashboard/stats'),
};

// ========== Lessons ==========
export const lessonApi = {
  getAll: () => api.get('/api/lessons'),
  getById: (id) => api.get(`/api/lessons/${id}`),
  create: (data) => api.post('/api/lessons', data),
  update: (id, data) => api.put(`/api/lessons/${id}`, data),
  delete: (id) => api.delete(`/api/lessons/${id}`),
  updateStatus: (id, status) => api.put(`/api/lessons/${id}/status`, { status }),
  getByMarker: (markerCode) => api.get(`/api/lessons/by-marker/${markerCode}`),
};

// ========== Assets (Steps) ==========
export const assetApi = {
  getByLesson: (lessonId) => api.get(`/api/assets/lesson/${lessonId}`),
  create: (data) => api.post('/api/assets', data),
  update: (id, data) => api.put(`/api/assets/${id}`, data),
  delete: (id) => api.delete(`/api/assets/${id}`),
};

// ========== Markers ==========
export const markerApi = {
  create: (data) => api.post('/api/markers', data),
  getByLesson: (lessonId) => api.get(`/api/markers/lesson/${lessonId}`),
};

// ========== Uploads ==========
export const uploadApi = {
  uploadAudio: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/uploads/audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ========== Quiz ==========
export const quizApi = {
  getByLesson: (lessonId) => api.get(`/api/quizzes/lesson/${lessonId}`),
  create: (data) => api.post('/api/quizzes', data),
  addQuestion: (quizId, data) => api.post(`/api/quizzes/${quizId}/questions`, data),
  deleteQuestion: (questionId) => api.delete(`/api/quizzes/questions/${questionId}`),
};

// ========== Gamification ==========
export const gameApi = {
  getByLesson: (lessonId) => api.get(`/api/gamification/lesson/${lessonId}`),
};

export default api;
