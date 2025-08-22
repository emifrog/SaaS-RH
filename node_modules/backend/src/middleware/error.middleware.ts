import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { HTTP_STATUS } from '../utils/constants';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BusinessError extends AppError {
  constructor(message: string) {
    super(message, HTTP_STATUS.BAD_REQUEST);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Non authentifié') {
    super(message, HTTP_STATUS.UNAUTHORIZED);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Non autorisé') {
    super(message, HTTP_STATUS.FORBIDDEN);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Ressource non trouvée') {
    super(message, HTTP_STATUS.NOT_FOUND);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, HTTP_STATUS.CONFLICT);
  }
}

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = 'Une erreur est survenue';
  let errors: any = undefined;

  // Zod validation errors
  if (err instanceof ZodError) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Erreur de validation';
    errors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }
  // JWT errors
  else if (err instanceof TokenExpiredError) {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = 'Token expiré';
  }
  else if (err instanceof JsonWebTokenError) {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
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
    if (prismaError.code === 'P2002') {
      statusCode = HTTP_STATUS.CONFLICT;
      message = 'Cette valeur existe déjà';
    } else if (prismaError.code === 'P2025') {
      statusCode = HTTP_STATUS.NOT_FOUND;
      message = 'Enregistrement non trouvé';
    }
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
