// Auth types to handle the new role system
export interface UserRole {
  code: string;
  libelle: string;
  permissions: any;
}

export interface TokenPayload {
  userId: number;
  matricule: string;
  roles: UserRole[];
}

export interface AuthenticatedUser {
  userId: number;
  matricule: string;
  roles: UserRole[];
}
