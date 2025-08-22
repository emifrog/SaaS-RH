import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/services/api';

interface TypeFMPA {
  id: string;
  code: string;
  libelle: string;
  dureeHeures: number;
  tauxHoraire: number;
  description?: string;
}

interface SessionFMPA {
  id: string;
  typeFMPA: TypeFMPA;
  dateDebut: string;
  dateFin: string;
  lieu: string;
  placesMax: number;
  placesOccupees: number;
  formateurPrincipal: any;
  statut: string;
  codeTTA?: string;
  inscriptions?: any[];
}

interface FMPAState {
  sessions: SessionFMPA[];
  currentSession: SessionFMPA | null;
  typesFMPA: TypeFMPA[];
  isLoading: boolean;
  error: string | null;
}

const initialState: FMPAState = {
  sessions: [],
  currentSession: null,
  typesFMPA: [],
  isLoading: false,
  error: null,
};

export const fetchSessions = createAsyncThunk('fmpa/fetchSessions', async () => {
  const response = await api.get('/fmpa/sessions');
  return response.data;
});

export const fetchSession = createAsyncThunk(
  'fmpa/fetchSession',
  async (id: string) => {
    const response = await api.get(`/fmpa/sessions/${id}`);
    return response.data;
  }
);

export const createSession = createAsyncThunk(
  'fmpa/createSession',
  async (data: any) => {
    const response = await api.post('/fmpa/sessions', data);
    return response.data;
  }
);

export const updateSession = createAsyncThunk(
  'fmpa/updateSession',
  async ({ id, data }: { id: string; data: any }) => {
    const response = await api.put(`/fmpa/sessions/${id}`, data);
    return response.data;
  }
);

export const deleteSession = createAsyncThunk(
  'fmpa/deleteSession',
  async (id: string) => {
    await api.delete(`/fmpa/sessions/${id}`);
    return id;
  }
);

export const inscribeToSession = createAsyncThunk(
  'fmpa/inscribe',
  async ({ sessionId, personnelId }: { sessionId: string; personnelId: string }) => {
    const response = await api.post(`/fmpa/sessions/${sessionId}/inscriptions`, {
      personnelId,
    });
    return response.data;
  }
);

export const exportTTA = createAsyncThunk(
  'fmpa/exportTTA',
  async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
    const response = await api.get('/fmpa/export/tta', {
      params: { startDate, endDate },
      responseType: 'blob',
    });
    return response.data;
  }
);

const fmpaSlice = createSlice({
  name: 'fmpa',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch sessions
      .addCase(fetchSessions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSessions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.sessions = action.payload;
      })
      .addCase(fetchSessions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Erreur lors du chargement des sessions';
      })
      // Fetch single session
      .addCase(fetchSession.fulfilled, (state, action) => {
        state.currentSession = action.payload;
      })
      // Create session
      .addCase(createSession.fulfilled, (state, action) => {
        state.sessions.push(action.payload);
      })
      // Update session
      .addCase(updateSession.fulfilled, (state, action) => {
        const index = state.sessions.findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.sessions[index] = action.payload;
        }
        if (state.currentSession?.id === action.payload.id) {
          state.currentSession = action.payload;
        }
      })
      // Delete session
      .addCase(deleteSession.fulfilled, (state, action) => {
        state.sessions = state.sessions.filter(s => s.id !== action.payload);
      });
  },
});

export const { clearError } = fmpaSlice.actions;
export default fmpaSlice.reducer;
