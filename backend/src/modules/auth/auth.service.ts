import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../server';
import { StatutPersonnel } from '@prisma/client';
import { LoginDTO, ChangePasswordDTO } from './auth.validation';
import { AuthenticationError, NotFoundError, BusinessError } from '../../middleware/error.middleware';
import { logger } from '../../utils/logger';
import { TokenPayload, UserRole } from '../../types/auth.types';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

export class AuthService {
  private readonly accessTokenSecret = process.env.JWT_ACCESS_SECRET!;
  private readonly refreshTokenSecret = process.env.JWT_REFRESH_SECRET!;
  private readonly accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
  private readonly refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';

  async login(data: LoginDTO, req: Request) {
    const user = await prisma.personnel.findUnique({
      where: { matricule: data.matricule },
      include: {
        centre: true,
        personnelRoles: {
          include: { 
            role: true
          }
        }
      },
    });

    if (!user) {
      throw new AuthenticationError('Matricule ou mot de passe incorrect');
    }

    if (user.statut !== StatutPersonnel.ACTIF) {
      throw new AuthenticationError('Compte suspendu ou inactif');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Matricule ou mot de passe incorrect');
    }

    // Récupérer les rôles avec leurs permissions
    const roleIds = user.personnelRoles.map(pr => pr.roleId);
    const roles = await prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: {
        code: true,
        libelle: true,
        permissions: true
      }
    });

    const userRoles: UserRole[] = roles.map(role => ({
      code: role.code,
      libelle: role.libelle || role.code,
      permissions: Array.isArray(role.permissions) ? role.permissions : []
    }));

    // Generate tokens
    const accessToken = this.generateAccessToken({
      userId: user.id,
      matricule: user.matricule,
      roles: userRoles,
    });

    const refreshToken = uuidv4();
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days expiry

    // Create session and tokens
    await prisma.$transaction([
      // Create auth session
      prisma.authSession.create({
        data: {
          personnelId: user.id,
          refreshToken,
          userAgent: req.headers['user-agent'],
          ip: req.ip || 'unknown',
          expiresAt: refreshTokenExpiry,
        },
      }),
      // Create access token
      prisma.authToken.create({
        data: {
          personnelId: user.id,
          token: accessToken,
          type: 'ACCESS',
          expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        },
      }),
      // Create refresh token
      prisma.authToken.create({
        data: {
          personnelId: user.id,
          token: refreshToken,
          type: 'REFRESH',
          expires: refreshTokenExpiry,
        },
      }),
      // Update last login
      prisma.personnel.update({
        where: { id: user.id },
        data: { 
          // lastLogin: new Date(), // Field doesn't exist in current schema
          refreshToken, // Keep for backward compatibility
        },
      }),
    ]);

    // Log successful login
    logger.info(`Login successful for user ${user.matricule}`, { userId: user.id });

    // Remove sensitive data
    const { password, ...userWithoutSensitive } = user;

    return {
      user: userWithoutSensitive,
      accessToken,
      refreshToken,
    };
  }

  async validateToken(token: string, type: 'ACCESS' | 'REFRESH') {
    try {
      // Verify JWT signature
      const payload = jwt.verify(
        token, 
        type === 'ACCESS' ? this.accessTokenSecret : this.refreshTokenSecret
      ) as TokenPayload;

      // Check if token exists and is not blacklisted
      const tokenRecord = await prisma.authToken.findUnique({
        where: { token },
        include: { personnel: true }
      });

      if (!tokenRecord || tokenRecord.blacklisted || tokenRecord.expires < new Date()) {
        throw new AuthenticationError('Token invalide ou expiré');
      }

      if (tokenRecord.type !== type) {
        throw new AuthenticationError('Type de token incorrect');
      }

      return {
        userId: payload.userId,
        matricule: payload.matricule,
        roles: payload.roles || []
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Token invalide');
      }
      throw error;
    }
  }

  async refreshToken(refreshToken: string, _req: Request) {
    // Verify the refresh token exists and is valid
    const session = await prisma.authSession.findUnique({
      where: { refreshToken },
      include: {
        personnel: {
          include: {
            personnelRoles: {
              include: { role: true }
            }
          }
        }
      },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new AuthenticationError('Session expirée ou invalide');
    }

    const user = session.personnel;

    if (user.statut !== StatutPersonnel.ACTIF) {
      throw new AuthenticationError('Compte suspendu ou inactif');
    }

    // Invalidate old access tokens
    await prisma.authToken.updateMany({
      where: {
        personnelId: user.id,
        type: 'ACCESS',
        blacklisted: false,
      },
      data: { blacklisted: true },
    });

    // Get roles with permissions
    const roleIds = user.personnelRoles.map(pr => pr.roleId);
    const roles = await prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: {
        code: true,
        libelle: true,
        permissions: true
      }
    });

    const userRoles: UserRole[] = roles.map(role => ({
      code: role.code,
      libelle: role.libelle || role.code,
      permissions: Array.isArray(role.permissions) ? role.permissions : []
    }));

    // Generate new access token
    const accessToken = this.generateAccessToken({
      userId: user.id,
      matricule: user.matricule,
      roles: userRoles,
    });

    // Create new access token record
    await prisma.authToken.create({
      data: {
        personnelId: user.id,
        token: accessToken,
        type: 'ACCESS',
        expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      },
    });

    return { accessToken };
  }

  async logout(userId: number, _token?: string) {
    await prisma.$transaction([
      // Invalidate all user sessions
      prisma.authSession.deleteMany({
        where: { personnelId: userId },
      }),
      // Invalidate all user tokens
      prisma.authToken.updateMany({
        where: { 
          personnelId: userId,
          type: { in: ['ACCESS', 'REFRESH'] },
        },
        data: { blacklisted: true },
      }),
      // Clear refresh token (for backward compatibility)
      prisma.personnel.update({
        where: { id: userId },
        data: { refreshToken: null },
      }),
    ]);

    logger.info(`Logout successful for user ${userId}`);
  }

  async changePassword(userId: number, data: ChangePasswordDTO) {
    const user = await prisma.personnel.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('Utilisateur non trouvé');
    }

    const isOldPasswordValid = await bcrypt.compare(data.oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new AuthenticationError('Ancien mot de passe incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(data.newPassword, 12);

    await prisma.personnel.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    // Invalidate all existing sessions and tokens
    await this.logout(userId);

    logger.info(`Password changed for user ${userId}`);
  }

  private generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
    } as jwt.SignOptions);
  }

  private generateRefreshToken(payload: Omit<TokenPayload, 'roles'>): string {
    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
    } as jwt.SignOptions);
  }
}

export const authService = new AuthService();
