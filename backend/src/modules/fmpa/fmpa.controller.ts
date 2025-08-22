import { Request, Response, NextFunction } from 'express';
import { fmpaService } from './fmpa.service';
import { HTTP_STATUS } from '../../utils/constants';
import { 
  CreateSessionDTO, 
  UpdateSessionDTO, 
  QuerySessionsDTO,
  InscriptionDTO,
  PresenceDTO,
  ExportTTADTO 
} from './fmpa.validation';

export class FMPAController {
  async createSession(req: Request, res: Response, next: NextFunction) {
    try {
      const data: CreateSessionDTO = req.body;
      const session = await fmpaService.createSession(data);
      
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSession(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const data: UpdateSessionDTO = req.body;
      const session = await fmpaService.updateSession(id, data);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query as unknown as QuerySessionsDTO;
      const sessions = await fmpaService.getSessions(query);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSessionById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      const session = await fmpaService.getSessionById(id);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteSession(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      await fmpaService.deleteSession(id);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Session supprimée avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  async inscrirePersonnel(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = parseInt(req.params.id);
      const data: InscriptionDTO = req.body;
      const inscription = await fmpaService.inscrirePersonnel(sessionId, data);
      
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: inscription,
      });
    } catch (error) {
      next(error);
    }
  }

  async desinscrirePersonnel(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = parseInt(req.params.id);
      const personnelId = parseInt(req.params.personnelId);
      await fmpaService.desinscrirePersonnel(sessionId, personnelId);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Désinscription réussie',
      });
    } catch (error) {
      next(error);
    }
  }

  async marquerPresence(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = parseInt(req.params.id);
      const data: PresenceDTO = req.body;
      const inscription = await fmpaService.marquerPresence(sessionId, data);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: inscription,
      });
    } catch (error) {
      next(error);
    }
  }

  async exportTTA(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query as unknown as ExportTTADTO;
      const exportData = await fmpaService.exportTTA(query);
      
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="export-tta-${query.mois}.csv"`);
      
      res.status(HTTP_STATUS.OK).send(exportData.csv);
    } catch (error) {
      next(error);
    }
  }
}

export const fmpaController = new FMPAController();
