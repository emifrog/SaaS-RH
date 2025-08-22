import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { getCurrentUser } from '@/store/slices/authSlice';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import SessionsFMPA from '@/pages/fmpa/SessionsFMPA';
import SessionDetail from '@/pages/fmpa/SessionDetail';
import CreateSession from '@/pages/fmpa/CreateSession';
import Layout from '@/components/Layout';
import PrivateRoute from '@/components/PrivateRoute';
import LoadingSpinner from '@/components/LoadingSpinner';

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { accessToken, user } = useSelector((state: RootState) => state.auth);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (accessToken && !user) {
        try {
          await dispatch(getCurrentUser()).unwrap();
        } catch (error) {
          console.error('Failed to get user:', error);
        }
      }
      setIsInitializing(false);
    };
    initAuth();
  }, [dispatch, accessToken, user]);

  if (isInitializing) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <Routes>
      <Route path="/login" element={!accessToken ? <Login /> : <Navigate to="/" />} />
      
      <Route element={<PrivateRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/fmpa">
            <Route index element={<SessionsFMPA />} />
            <Route path="sessions" element={<SessionsFMPA />} />
            <Route path="sessions/new" element={<CreateSession />} />
            <Route path="sessions/:id" element={<SessionDetail />} />
            <Route path="sessions/:id/edit" element={<CreateSession />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
