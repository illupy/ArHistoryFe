import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

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
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
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

// ========== Annotations ==========
export const annotationApi = {
  getByLesson: (lessonId) => api.get(`/api/lessons/${lessonId}/annotations`),
  create: (lessonId, data) => api.post(`/api/lessons/${lessonId}/annotations`, data),
  update: (id, data) => api.put(`/api/annotations/${id}`, data),
  delete: (id) => api.delete(`/api/annotations/${id}`),
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

// ========== Uploads — Hybrid: TUS for large files, presigned PUT for small files ==========

import * as tus from 'tus-js-client';

// Direct storage hostname for optimal upload performance
const SUPABASE_PROJECT_ID = 'gfualrlzqenuressyeli';
const SUPABASE_TUS_ENDPOINT = `https://${SUPABASE_PROJECT_ID}.storage.supabase.co/storage/v1/upload/resumable`;
const SUPABASE_SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

// Threshold: files >= 6MB use TUS, smaller files use presigned PUT
const TUS_THRESHOLD = 6 * 1024 * 1024;

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

/**
 * Get presign data from backend (token, publicUrl, bucketName, objectName).
 */
const getPresignData = async (file, subDir) => {
  const contentType = detectContentType(file);
  const { data: presignRes } = await api.post('/api/uploads/presign', {
    subDir,
    filename: file.name,
    contentType,
  });
  return { ...presignRes.data, contentType };
};

/**
 * Small-file upload via presigned PUT URL (with progress via XMLHttpRequest).
 */
const uploadPresignedPut = (file, subDir, onProgress) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { signedUrl, publicUrl, contentType } = await getPresignData(file, subDir);

      const xhr = new XMLHttpRequest();
      xhr.open('PUT', signedUrl, true);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.setRequestHeader('x-upsert', 'true');
      xhr.setRequestHeader('cache-control', 'max-age=31536000');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Number(((e.loaded / e.total) * 100).toFixed(2)));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ data: { data: publicUrl } });
        } else {
          reject(new Error(`Upload lên Supabase thất bại (${xhr.status}): ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error khi upload'));
      xhr.send(file);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Large-file upload via TUS resumable protocol.
 * Uses signed upload token (x-signature header) — no auth header needed.
 */
const uploadWithTus = (file, subDir, onProgress) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { token, publicUrl, bucketName, objectName, contentType } = await getPresignData(file, subDir);

      const upload = new tus.Upload(file, {
        endpoint: SUPABASE_TUS_ENDPOINT,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'x-upsert': 'true',
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName: bucketName,
          objectName: objectName,
          contentType: contentType,
          cacheControl: '31536000',
        },
        chunkSize: 6 * 1024 * 1024, // Must be 6MB for Supabase
        onError: (error) => {
          console.error('TUS upload failed:', error);
          reject(error);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const percentage = Number(((bytesUploaded / bytesTotal) * 100).toFixed(2));
          if (onProgress) onProgress(percentage);
        },
        onSuccess: () => {
          resolve({ data: { data: publicUrl } });
        },
      });

      // Resume from previous upload if available
      upload.findPreviousUploads().then((previousUploads) => {
        if (previousUploads.length) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        upload.start();
      });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Smart upload: picks TUS for large files, presigned PUT for small files.
 * Both support onProgress(percentage) callback.
 */
const smartUpload = (file, subDir, onProgress) => {
  if (file.size >= TUS_THRESHOLD) {
    return uploadWithTus(file, subDir, onProgress);
  }
  return uploadPresignedPut(file, subDir, onProgress);
};

export const uploadApi = {
  uploadImage:       (file, onProgress)  => smartUpload(file, 'images', onProgress),
  uploadAudio:       (file, onProgress)  => smartUpload(file, 'audio', onProgress),
  uploadVideo:       (file, onProgress)  => smartUpload(file, 'videos', onProgress),
  uploadModel:       (file, onProgress)  => smartUpload(file, 'models', onProgress),
  uploadMultiImages: async (files, onProgress) => {
    let completed = 0;
    const total = [...files].length;
    const urls = await Promise.all([...files].map(f =>
      smartUpload(f, 'images', (pct) => {
        if (onProgress) onProgress(((completed + pct / 100) / total) * 100);
      }).then(r => {
        completed++;
        return r.data.data;
      })
    ));
    return { data: { data: urls } };
  },
};


// ========== Quiz ==========
export const quizApi = {
  getByLesson: (lessonId) => api.get(`/api/quizzes/lesson/${lessonId}`),
  create: (data) => api.post('/api/quizzes', data),
  addQuestion: (quizId, data) => api.post(`/api/quizzes/${quizId}/questions`, data),
  deleteQuestion: (questionId) => api.delete(`/api/quizzes/questions/${questionId}`),
  delete: (quizId) => api.delete(`/api/quizzes/${quizId}`),
};

// ========== Gamification ==========
export const gameApi = {
  getByLesson: (lessonId) => api.get(`/api/gamification/lesson/${lessonId}`),
};

// ========== Match3 Game ==========
export const match3Api = {
  getAll: () => api.get('/api/match3'),
  getById: (id) => api.get(`/api/match3/${id}`),
  create: (data) => api.post('/api/match3', data),
  update: (id, data) => api.put(`/api/match3/${id}`, data),
  delete: (id) => api.delete(`/api/match3/${id}`),
  getRandomGame: () => api.get('/api/match3/game'),
};

export default api;
