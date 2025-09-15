import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface PermissionGateProps {
  children: React.ReactNode;
  permissions?: string[];
  roles?: string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permissions = [],
  roles = [],
  requireAll = false,
  fallback = null,
}) => {
  const { hasPermission, hasRole, hasAnyPermission, hasAnyRole } = useAuth();

  // Check permissions
  let hasRequiredPermissions = true;
  if (permissions.length > 0) {
    hasRequiredPermissions = requireAll
      ? permissions.every(permission => hasPermission(permission))
      : hasAnyPermission(permissions);
  }

  // Check roles
  let hasRequiredRoles = true;
  if (roles.length > 0) {
    hasRequiredRoles = requireAll
      ? roles.every(role => hasRole(role))
      : hasAnyRole(roles);
  }

  // Show children if user has required permissions and roles
  if (hasRequiredPermissions && hasRequiredRoles) {
    return <>{children}</>;
  }

  // Show fallback or nothing
  return <>{fallback}</>;
};

export default PermissionGate;
