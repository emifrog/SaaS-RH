import axios from 'axios';
import { store } from '@/store';
import { refreshAccessToken } from '@/store/slices/authSlice';
import toast from 'react-hot-toast';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor pour ajouter le token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor pour gérer les erreurs et le refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          await store.dispatch(refreshAccessToken(refreshToken));
          const newToken = localStorage.getItem('accessToken');
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Rediriger vers login si le refresh échoue
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Afficher les erreurs
    if (error.response?.data?.message) {
      toast.error(error.response.data.message);
    } else if (error.message) {
      toast.error(error.message);
    }

    return Promise.reject(error);
  }
);
