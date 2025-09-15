import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import * as constants from '../utils/constants';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

type HTTP_STATUS = typeof constants.HTTP_STATUS[keyof typeof constants.HTTP_STATUS];

export class AppError extends Error {
  statusCode: HTTP_STATUS;
  isOperational: boolean;

  constructor(message: string, statusCode: HTTP_STATUS = constants.HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BusinessError extends AppError {
  constructor(message: string) {
    super(message, constants.HTTP_STATUS.BAD_REQUEST);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Non authentifié') {
    super(message, constants.HTTP_STATUS.UNAUTHORIZED);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Non autorisé') {
    super(message, constants.HTTP_STATUS.FORBIDDEN);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Ressource non trouvée') {
    super(message, constants.HTTP_STATUS.NOT_FOUND);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, constants.HTTP_STATUS.CONFLICT);
  }
}

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode: HTTP_STATUS = constants.HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = 'Une erreur est survenue';
  let errors: any = undefined;

  // Zod validation errors
  if (err instanceof ZodError) {
    statusCode = constants.HTTP_STATUS.BAD_REQUEST;
    message = 'Erreur de validation';
    errors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }
  // JWT errors
  else if (err instanceof TokenExpiredError) {
    statusCode = constants.HTTP_STATUS.UNAUTHORIZED;
    message = 'Token expiré';
  }
  else if (err instanceof JsonWebTokenError) {
    statusCode = constants.HTTP_STATUS.UNAUTHORIZED;
    message = 'Token invalide';
  }
  // App errors
  else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }
  // Prisma errors
  else if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    switch (prismaError.code) {
      case 'P2002': // Unique constraint violation
        statusCode = constants.HTTP_STATUS.CONFLICT;
        message = 'Cette valeur existe déjà';
        break;
      case 'P2025': // Record not found
        statusCode = constants.HTTP_STATUS.NOT_FOUND;
        message = 'Enregistrement non trouvé';
        break;
      case 'P2003': // Foreign key constraint failed
        statusCode = constants.HTTP_STATUS.BAD_REQUEST;
        message = 'Violation de contrainte de clé étrangère';
        break;
      case 'P2000': // Value too long for column
        statusCode = constants.HTTP_STATUS.BAD_REQUEST;
        message = 'La valeur fournie est trop longue pour le champ';
        break;
      case 'P2001': // Record does not exist
        statusCode = constants.HTTP_STATUS.NOT_FOUND;
        message = 'Enregistrement introuvable';
        break;
      case 'P2015': // Related record not found
        statusCode = constants.HTTP_STATUS.NOT_FOUND;
        message = 'Enregistrement lié introuvable';
        break;
      case 'P2016': // Query interpretation error
        statusCode = constants.HTTP_STATUS.BAD_REQUEST;
        message = 'Erreur d\'interprétation de la requête';
        break;
      case 'P2021': // Table does not exist
        statusCode = constants.HTTP_STATUS.INTERNAL_SERVER_ERROR;
        message = 'Erreur de configuration de la base de données';
        break;
      default:
        // Log les erreurs Prisma non gérées pour débogage
        logger.warn(`Erreur Prisma non gérée: ${prismaError.code}`, { error: prismaError });
        statusCode = constants.HTTP_STATUS.INTERNAL_SERVER_ERROR;
        message = 'Erreur de base de données';
    }
  }
  // Rate limiting errors
  else if (err instanceof Error && err.message.includes('Too many requests')) {
    statusCode = constants.HTTP_STATUS.TOO_MANY_REQUESTS;
    message = 'Trop de requêtes. Veuillez réessayer plus tard.';
  }
  // Service unavailable errors
  else if (err instanceof Error && err.message.includes('ECONNREFUSED')) {
    statusCode = constants.HTTP_STATUS.SERVICE_UNAVAILABLE;
    message = 'Service temporairement indisponible. Veuillez réessayer plus tard.';
  }

  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Send response
  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
