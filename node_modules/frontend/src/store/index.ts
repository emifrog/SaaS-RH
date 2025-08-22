import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import fmpaReducer from './slices/fmpaSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    fmpa: fmpaReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
