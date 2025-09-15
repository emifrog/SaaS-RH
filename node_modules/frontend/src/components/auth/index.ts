// Export all auth components for easy importing
export { default as LoginForm } from './LoginForm';
export { default as ProtectedRoute } from './ProtectedRoute';
export { default as PermissionGate } from './PermissionGate';
export { default as UnauthorizedPage } from './UnauthorizedPage';

// Re-export types if needed
export type { default as AuthContext } from '../../contexts/AuthContext';
