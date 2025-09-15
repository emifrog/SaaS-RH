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
      const query = req.query as unknown as ExportTTADTO;
      
      // Vérifier les paramètres requis pour l'export par plage de dates
      if (!req.params.id && (!query.startDate || !query.endDate)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          code: 'MISSING_PARAMETERS',
          message: 'Les paramètres startDate et endDate sont requis pour un export par plage de dates',
        });
      }
      
      // Si un ID est fourni dans les paramètres, c'est un export pour une session spécifique
      if (req.params.id) {
        try {
          const ttaService = new (await import('./tta-export.service')).TTAExportService();
          const buffer = await ttaService.generateTTAExport(req.params.id);
          
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', `attachment; filename="TTA_Session_${req.params.id}_${new Date().toISOString().split('T')[0]}.xlsx"`);
          return res.send(buffer);
        } catch (error: any) {
          if (error.message === 'Session non trouvée') {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
              success: false,
              code: 'SESSION_NOT_FOUND',
              message: 'La session demandée est introuvable',
            });
          }
          throw error;
        }
      }
      
      // Validation des dates pour l'export par plage
      const startDate = new Date(query.startDate);
      const endDate = new Date(query.endDate);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          code: 'INVALID_DATE_FORMAT',
          message: 'Format de date invalide. Utilisez le format AAAA-MM-JJ',
        });
      }
      
      // Vérifier que la plage de dates ne dépasse pas 3 mois
      const maxDate = new Date(startDate);
      maxDate.setMonth(maxDate.getMonth() + 3);
      
      if (endDate > maxDate) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          code: 'DATE_RANGE_TOO_LARGE',
          message: 'La plage de dates ne peut pas dépasser 3 mois',
          maxAllowedDays: 90,
        });
      }
      
      if (startDate > endDate) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          code: 'INVALID_DATE_RANGE',
          message: 'La date de début doit être antérieure à la date de fin',
        });
      }
      
      try {
        // Appel au service pour générer l'export
        const result = await fmpaService.exportTTA({
          ...query,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        });
        
        if (!result || !result.buffer) {
          return res.status(HTTP_STATUS.NO_CONTENT).json({
            success: false,
            code: 'NO_DATA_FOUND',
            message: 'Aucune donnée trouvée pour la période spécifiée',
          });
        }
        
        // Envoyer le fichier Excel en réponse
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${result.filename || `TTA_Export_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.xlsx`}"`
        );
        
        return res.send(result.buffer);
      } catch (error: any) {
        if (error.code === 'NO_SESSIONS_FOUND') {
          return res.status(HTTP_STATUS.NOT_FOUND).json({
            success: false,
            code: 'NO_SESSIONS_FOUND',
            message: 'Aucune session trouvée pour la période spécifiée',
            period: {
              start: startDate.toISOString().split('T')[0],
              end: endDate.toISOString().split('T')[0],
            },
          });
        }
        throw error;
      }
    } catch (error) {
      // Journaliser l'erreur pour le débogage
      console.error('Erreur lors de l\'export TTA:', error);
      
      // Si l'erreur est déjà une erreur HTTP, la transmettre telle quelle
      if ('status' in error && error.status) {
        return next(error);
      }
      
      // Sinon, créer une erreur 500 avec des détails
      const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
      const errorWithStatus = new Error(errorMessage);
      (errorWithStatus as any).status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
      next(errorWithStatus);
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
