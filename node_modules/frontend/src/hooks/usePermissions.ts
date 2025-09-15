import { useAuth } from '../contexts/AuthContext';

export const usePermissions = () => {
  const { hasPermission, hasRole, hasAnyPermission, hasAnyRole, user } = useAuth();

  // Common permission checks
  const canManagePersonnel = () => hasPermission('personnel.manage');
  const canViewPersonnel = () => hasPermission('personnel.view');
  const canManageFMPA = () => hasPermission('fmpa.manage');
  const canViewFMPA = () => hasPermission('fmpa.view');
  const canManageMateriel = () => hasPermission('materiel.manage');
  const canViewMateriel = () => hasPermission('materiel.view');
  const canManageReports = () => hasPermission('reports.manage');
  const canViewReports = () => hasPermission('reports.view');

  // Role checks
  const isAdmin = () => hasRole('ADMIN');
  const isManager = () => hasRole('MANAGER');
  const isFormateur = () => hasRole('FORMATEUR');
  const isUser = () => hasRole('USER');

  // Complex permission checks
  const canAccessAdminPanel = () => isAdmin() || hasPermission('admin.access');
  const canManageUsers = () => isAdmin() || hasPermission('users.manage');
  const canExportData = () => hasAnyPermission(['export.tta', 'export.personnel', 'export.fmpa']);

  return {
    // Basic permission functions
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAnyRole,
    
    // User info
    user,
    
    // Common permissions
    canManagePersonnel,
    canViewPersonnel,
    canManageFMPA,
    canViewFMPA,
    canManageMateriel,
    canViewMateriel,
    canManageReports,
    canViewReports,
    
    // Role checks
    isAdmin,
    isManager,
    isFormateur,
    isUser,
    
    // Complex permissions
    canAccessAdminPanel,
    canManageUsers,
    canExportData,
  };
};

export default usePermissions;
