import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

export default function PrivateRoute() {
  const { accessToken } = useSelector((state: RootState) => state.auth);

  return accessToken ? <Outlet /> : <Navigate to="/login" replace />;
}
