import { Request, Response, NextFunction } from 'express';
import { fmpaService } from './fmpa.service';
import { prisma } from '../../server';
import { 
  CreateSessionDTO, 
  UpdateSessionDTO, 
  QuerySessionsDTO,
  InscriptionDTO,
  PresenceDTO,
  ExportTTADTO 
} from './fmpa.validation';

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};

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
      const { id } = req.params;
      if (id) {
        // Export pour une session spécifique
        const ttaService = new (await import('./tta-export.service')).TTAExportService();
        const buffer = await ttaService.generateTTAExport(id);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="TTA_${id}.xlsx"`);
        res.send(buffer);
      } else {
        // Export général (ancien comportement)
        const query = req.query as unknown as ExportTTADTO;
        const exportData = await fmpaService.exportTTA(query);
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="export-tta-${query.mois}.csv"`);
        
        res.status(HTTP_STATUS.OK).send(exportData.csv);
      }
    } catch (error) {
      next(error);
    }
  }

  async exportMonthlyReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { month, year, centreId } = req.query;
      const ttaService = new (await import('./tta-export.service')).TTAExportService();
      const buffer = await ttaService.generateMonthlyReport(
        Number(month),
        Number(year),
        centreId as string
      );
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Rapport_FMPA_${month}_${year}.xlsx"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  async addSignature(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { personnelId, type, signature } = req.body;
      
      const result = await prisma.signatureFMPA.create({
        data: {
          sessionFMPAId: parseInt(id),
          personnelId,
          type,
          signature,
        },
      });
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSignatures(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const signatures = await prisma.signatureFMPA.findMany({
        where: { sessionFMPAId: parseInt(id) },
        include: {
          personnel: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              grade: true,
            },
          },
        },
      });
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: signatures,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const fmpaController = new FMPAController();
