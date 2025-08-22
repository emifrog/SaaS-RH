import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../server';
import { AuthenticationError, AuthorizationError } from './error.middleware';
import { Role } from '@prisma/client';

interface JwtPayload {
  userId: number;
  matricule: string;
  roles: Role[];
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      throw new AuthenticationError('Token manquant');
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET!
    ) as JwtPayload;

    // Verify user still exists and is active
    const user = await prisma.personnel.findUnique({
      where: { id: decoded.userId },
      select: { id: true, matricule: true, roles: true, statut: true },
    });

    if (!user || user.statut !== 'ACTIF') {
      throw new AuthenticationError('Utilisateur inactif ou inexistant');
    }

    req.user = {
      userId: user.id,
      matricule: user.matricule,
      roles: user.roles,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError());
    }

    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
    
    if (!hasRole) {
      return next(new AuthorizationError('Rôle insuffisant pour cette action'));
    }

    next();
  };
};

export const authorizeOwnerOrRoles = (ownerField: string, ...allowedRoles: Role[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError());
    }

    // Check if user has one of the allowed roles
    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
    if (hasRole) {
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
