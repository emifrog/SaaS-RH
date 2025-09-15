import { Request, Response, NextFunction } from 'express';
import { prisma } from '../server';
import { AuthenticationError, AuthorizationError } from './error.middleware';
import { UserStatus } from '@prisma/client';
import { authService } from '../modules/auth/auth.service';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        matricule: string;
        roles: string[];
        permissions: string[];
      };
    }
  }
}

// Le paramètre 'res' est requis par Express mais n'est pas utilisé ici
// Il est donc préfixé par un underscore pour indiquer qu'il est intentionnellement inutilisé
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      throw new AuthenticationError('Token manquant');
    }

    // Verify token is valid and not blacklisted
    const { userId } = await authService.validateToken(token, 'ACCESS');

    // Get user with roles and permissions
    const user = await prisma.personnel.findUnique({
      where: { 
        id: userId,
        status: UserStatus.ACTIVE,
      },
      include: {
        personnelRoles: {
          where: { dateFin: null },
          include: { role: true }
        }
      },
    });

    if (!user) {
      throw new AuthenticationError('Utilisateur inactif ou inexistant');
    }

    // Extract roles and permissions
    const roles = user.personnelRoles.map(pr => pr.role.code);
    const permissions = Array.from(
      new Set(
        user.personnelRoles.flatMap(pr => 
          Array.isArray(pr.role.permissions) 
            ? pr.role.permissions.map((p: any) => p.code || p)
            : []
        )
      )
    ) as string[];

    req.user = {
      userId: user.id,
      matricule: user.matricule,
      roles,
      permissions,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Non authentifié'));
    }

    const hasPermission = requiredPermissions.every(permission => 
      req.user?.permissions.includes(permission)
    );
    
    if (!hasPermission) {
      return next(new AuthorizationError('Droits insuffisants pour cette action'));
    }

    next();
  };
};

export const hasRole = (...requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Non authentifié'));
    }

    const hasRequiredRole = requiredRoles.some(role => 
      req.user?.roles.includes(role)
    );
    
    if (!hasRequiredRole) {
      return next(new AuthorizationError('Rôle insuffisant pour cette action'));
    }

    next();
  };
};

export const authorizeOwnerOrPermissions = (
  ownerField: string, 
  ...requiredPermissions: string[]
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Non authentifié'));
    }

    // Check if user has required permissions
    const hasPermission = requiredPermissions.every(permission => 
      req.user?.permissions.includes(permission)
    );
    
    if (hasPermission) {
      return next();
    }

    // Check if user is the owner
    const resourceId = req.params[ownerField] || req.body[ownerField];
    if (resourceId && parseInt(resourceId) === req.user.userId) {
      return next();
    }

    next(new AuthorizationError('Non autorisé à accéder à cette ressource'));
  };
};
