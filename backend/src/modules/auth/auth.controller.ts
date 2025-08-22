import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { LoginDTO, RefreshTokenDTO, ChangePasswordDTO } from './auth.validation';
import { HTTP_STATUS } from '../../utils/constants';

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data: LoginDTO = req.body;
      const result = await authService.login(data);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const data: RefreshTokenDTO = req.body;
      const tokens = await authService.refreshToken(data.refreshToken);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: tokens,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.logout(req.user!.userId);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Déconnexion réussie',
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const data: ChangePasswordDTO = req.body;
      await authService.changePassword(req.user!.userId, data);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Mot de passe modifié avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getCurrentUser(req.user!.userId);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
