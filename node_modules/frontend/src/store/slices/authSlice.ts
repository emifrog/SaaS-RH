import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { api } from '@/services/api';

interface User {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  roles: string[];
  centreId: string;
  grade: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isLoading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ matricule, password }: { matricule: string; password: string }) => {
    const response = await api.post('/auth/login', { matricule, password });
    return response.data;
  }
);

export const refreshAccessToken = createAsyncThunk(
  'auth/refresh',
  async (refreshToken: string) => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (refreshToken) {
    await api.post('/auth/logout', { refreshToken });
  }
});

export const getCurrentUser = createAsyncThunk('auth/me', async () => {
  const response = await api.get('/auth/me');
  return response.data;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        localStorage.setItem('accessToken', action.payload.accessToken);
        localStorage.setItem('refreshToken', action.payload.refreshToken);
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Erreur de connexion';
      })
      // Refresh
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken;
        localStorage.setItem('accessToken', action.payload.accessToken);
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      })
      // Get current user
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
