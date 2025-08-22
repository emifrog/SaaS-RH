import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../server';
import { Personnel, Role } from '@prisma/client';
import { LoginDTO, ChangePasswordDTO } from './auth.validation';
import { AuthenticationError, NotFoundError, BusinessError } from '../../middleware/error.middleware';
import { logger } from '../../utils/logger';

interface TokenPayload {
  userId: number;
  matricule: string;
  roles: Role[];
}

export class AuthService {
  private readonly accessTokenSecret = process.env.JWT_ACCESS_SECRET!;
  private readonly refreshTokenSecret = process.env.JWT_REFRESH_SECRET!;
  private readonly accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
  private readonly refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';

  async login(data: LoginDTO) {
    const user = await prisma.personnel.findUnique({
      where: { matricule: data.matricule },
      include: {
        centre: true,
      },
    });

    if (!user) {
      throw new AuthenticationError('Matricule ou mot de passe incorrect');
    }

    if (user.statut !== 'ACTIF') {
      throw new AuthenticationError('Compte suspendu ou inactif');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Matricule ou mot de passe incorrect');
    }

    const tokens = this.generateTokens({
      userId: user.id,
      matricule: user.matricule,
      roles: user.roles,
    });

    // Save refresh token
    await prisma.personnel.update({
      where: { id: user.id },
      data: { refreshToken: tokens.refreshToken },
    });

    // Log successful login
    logger.info(`Login successful for user ${user.matricule}`);

    // Remove sensitive data
    const { password, refreshToken, ...userWithoutSensitive } = user;

    return {
      user: userWithoutSensitive,
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(
        refreshToken,
        this.refreshTokenSecret
      ) as TokenPayload;

      const user = await prisma.personnel.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new AuthenticationError('Refresh token invalide');
      }

      if (user.statut !== 'ACTIF') {
        throw new AuthenticationError('Compte suspendu ou inactif');
      }

      const tokens = this.generateTokens({
        userId: user.id,
        matricule: user.matricule,
        roles: user.roles,
      });

      // Update refresh token
      await prisma.personnel.update({
        where: { id: user.id },
        data: { refreshToken: tokens.refreshToken },
      });

      return tokens;
    } catch (error) {
      throw new AuthenticationError('Refresh token invalide ou expiré');
    }
  }

  async logout(userId: number) {
    await prisma.personnel.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    logger.info(`Logout successful for user ${userId}`);
  }

  async changePassword(userId: number, data: ChangePasswordDTO) {
    const user = await prisma.personnel.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Utilisateur non trouvé');
    }

    const isOldPasswordValid = await bcrypt.compare(data.oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new BusinessError('Ancien mot de passe incorrect');
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    await prisma.personnel.update({
      where: { id: userId },
      data: { 
        password: hashedPassword,
        refreshToken: null, // Invalidate refresh token
      },
    });

    logger.info(`Password changed for user ${userId}`);
  }

  async getCurrentUser(userId: number) {
    const user = await prisma.personnel.findUnique({
      where: { id: userId },
      include: {
        centre: true,
        aptitudeMedicale: true,
        competences: {
          orderBy: { dateExpiration: 'asc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('Utilisateur non trouvé');
    }

    const { password, refreshToken, ...userWithoutSensitive } = user;
    return userWithoutSensitive;
  }

  private generateTokens(payload: TokenPayload) {
    const accessToken = jwt.sign(
      payload,
      this.accessTokenSecret,
      { expiresIn: this.accessTokenExpiry }
    );

    const refreshToken = jwt.sign(
      payload,
      this.refreshTokenSecret,
      { expiresIn: this.refreshTokenExpiry }
    );

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
