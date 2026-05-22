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
  update: (id, data) => api.put(`/api/markers/${id}`, data),
  delete: (id) => api.delete(`/api/markers/${id}`),
  toggleActive: (id) => api.put(`/api/markers/${id}/toggle-active`),
};

// ========== Marker Models (Independent marker-model3D pairs) ==========
export const markerModelApi = {
  getAll: () => api.get('/api/marker-models'),
  getById: (id) => api.get(`/api/marker-models/${id}`),
  create: (data) => api.post('/api/marker-models', data),
  update: (id, data) => api.put(`/api/marker-models/${id}`, data),
  delete: (id) => api.delete(`/api/marker-models/${id}`),
};

// ========== Uploads — FE uploads directly to Supabase via presigned URL ==========

/** Detect MIME type từ file.type hoặc fallback từ extension */
const detectContentType = (file) => {
  if (file.type && file.type !== 'application/octet-stream') return file.type;
  const ext = (file.name || '').split('.').pop().toLowerCase();
  const map = {
    // Video
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
    avi: 'video/x-msvideo', mkv: 'video/x-matroska',
    // Audio
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', aac: 'audio/aac',
    // Image
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    // 3D Models
    fbx: 'application/octet-stream', glb: 'model/gltf-binary', gltf: 'model/gltf+json',
  };
  return map[ext] || 'application/octet-stream';
};

const uploadDirect = async (file, subDir) => {
  const contentType = detectContentType(file);

  // 1. Get presigned URL from backend (backend uses service-role key to sign)
  const { data: presignRes } = await api.post('/api/uploads/presign', {
    subDir,
    filename: file.name,
    contentType,
  });
  const { signedUrl, publicUrl } = presignRes.data;

  // 2. PUT file directly to Supabase Storage (no auth header needed — URL is signed)
  const putRes = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });

  if (!putRes.ok) {
    const text = await putRes.text();
    throw new Error(`Upload lên Supabase thất bại (${putRes.status}): ${text}`);
  }

  // 3. Return publicUrl in the same shape as before so pages need no changes
  return { data: { data: publicUrl } };
};

export const uploadApi = {
  uploadImage:       (file)  => uploadDirect(file, 'images'),
  uploadAudio:       (file)  => uploadDirect(file, 'audio'),
  uploadVideo:       (file)  => uploadDirect(file, 'videos'),
  uploadModel:       (file)  => uploadDirect(file, 'models'),
  uploadMultiImages: async (files) => {
    const urls = await Promise.all([...files].map(f => uploadDirect(f, 'images').then(r => r.data.data)));
    return { data: { data: urls } };
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
