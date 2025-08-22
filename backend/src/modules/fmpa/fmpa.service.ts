import { prisma } from '../../server';
import { 
  CreateSessionDTO, 
  UpdateSessionDTO, 
  QuerySessionsDTO,
  InscriptionDTO,
  PresenceDTO,
  ExportTTADTO 
} from './fmpa.validation';
import { BusinessError, NotFoundError, ConflictError } from '../../middleware/error.middleware';
import { FMPA_RULES } from '../../utils/constants';
import { logger } from '../../utils/logger';
import { notificationService } from '../../services/notification.service';
import { StatutInscription, StatutSession } from '@prisma/client';

export class FMPAService {
  async createSession(data: CreateSessionDTO) {
    // Validation métier
    if (data.placesMax > FMPA_RULES.MAX_INSCRITS) {
      throw new BusinessError(`Maximum ${FMPA_RULES.MAX_INSCRITS} places par session`);
    }

    if (data.placesMax < FMPA_RULES.MIN_INSCRITS) {
      throw new BusinessError(`Minimum ${FMPA_RULES.MIN_INSCRITS} places par session`);
    }

    // Vérifier que le formateur existe et a le bon rôle
    const formateur = await prisma.personnel.findUnique({
      where: { id: data.formateurPrincipalId },
    });

    if (!formateur || !formateur.roles.includes('FORMATEUR')) {
      throw new BusinessError('Le formateur principal doit avoir le rôle FORMATEUR');
    }

    // Créer la session
    const session = await prisma.sessionFMPA.create({
      data: {
        ...data,
        dateDebut: new Date(data.dateDebut),
        dateFin: new Date(data.dateFin),
      },
      include: {
        typeFMPA: true,
        formateurPrincipal: true,
        centre: true,
      },
    });

    // Notifier les personnels du centre
    await notificationService.notifyNewSession(session);

    logger.info(`Session FMPA créée: ${session.id}`);
    return session;
  }

  async updateSession(id: number, data: UpdateSessionDTO) {
    const session = await prisma.sessionFMPA.findUnique({
      where: { id },
    });

    if (!session) {
      throw new NotFoundError('Session non trouvée');
    }

    // Validation métier pour les modifications
    if (data.placesMax !== undefined) {
      if (data.placesMax < session.placesOccupees) {
        throw new BusinessError('Impossible de réduire les places en dessous du nombre d\'inscrits');
      }
    }

    const updatedSession = await prisma.sessionFMPA.update({
      where: { id },
      data: {
        ...data,
        dateDebut: data.dateDebut ? new Date(data.dateDebut) : undefined,
        dateFin: data.dateFin ? new Date(data.dateFin) : undefined,
      },
      include: {
        typeFMPA: true,
        formateurPrincipal: true,
        centre: true,
        inscriptions: {
          include: {
            personnel: true,
          },
        },
      },
    });

    // Notifier les inscrits si changement important
    if (data.dateDebut || data.dateFin || data.lieu || data.statut === 'ANNULE') {
      await notificationService.notifySessionUpdate(updatedSession);
    }

    return updatedSession;
  }

  async getSessions(query: QuerySessionsDTO) {
    const where: any = {};

    if (query.mois) {
      const [year, month] = query.mois.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      
      where.dateDebut = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (query.centreId) {
      where.centreId = parseInt(query.centreId);
    }

    if (query.statut) {
      where.statut = query.statut;
    }

    if (query.formateurId) {
      where.formateurPrincipalId = parseInt(query.formateurId);
    }

    const sessions = await prisma.sessionFMPA.findMany({
      where,
      include: {
        typeFMPA: true,
        formateurPrincipal: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            grade: true,
          },
        },
        centre: true,
        inscriptions: {
          select: {
            id: true,
            statut: true,
            personnelId: true,
          },
        },
      },
      orderBy: {
        dateDebut: 'asc',
      },
    });

    return sessions;
  }

  async getSessionById(id: number) {
    const session = await prisma.sessionFMPA.findUnique({
      where: { id },
      include: {
        typeFMPA: true,
        formateurPrincipal: true,
        centre: true,
        inscriptions: {
          include: {
            personnel: {
              select: {
                id: true,
                matricule: true,
                nom: true,
                prenom: true,
                grade: true,
                telephone: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundError('Session non trouvée');
    }

    return session;
  }

  async inscrirePersonnel(sessionId: number, data: InscriptionDTO) {
    // Vérifier que la session existe et n'est pas complète
    const session = await prisma.sessionFMPA.findUnique({
      where: { id: sessionId },
      include: {
        inscriptions: true,
      },
    });

    if (!session) {
      throw new NotFoundError('Session non trouvée');
    }

    if (session.statut !== 'PLANIFIE' && session.statut !== 'CONFIRME') {
      throw new BusinessError('Impossible de s\'inscrire à une session terminée ou annulée');
    }

    if (session.placesOccupees >= session.placesMax) {
      throw new BusinessError('Session complète');
    }

    // Vérifier que le personnel existe et est apte
    const personnel = await prisma.personnel.findUnique({
      where: { id: data.personnelId },
      include: {
        aptitudeMedicale: true,
      },
    });

    if (!personnel) {
      throw new NotFoundError('Personnel non trouvé');
    }

    if (personnel.statut !== 'ACTIF') {
      throw new BusinessError('Personnel inactif');
    }

    // Vérifier l'aptitude médicale
    if (personnel.aptitudeMedicale) {
      if (personnel.aptitudeMedicale.statut === 'INAPTE') {
        throw new BusinessError('Aptitude médicale invalide');
      }

      const today = new Date();
      if (personnel.aptitudeMedicale.dateProchainExamen < today) {
        throw new BusinessError('Visite médicale expirée');
      }
    }

    // Vérifier que le personnel n'est pas déjà inscrit
    const existingInscription = session.inscriptions.find(
      i => i.personnelId === data.personnelId
    );

    if (existingInscription) {
      throw new ConflictError('Personnel déjà inscrit à cette session');
    }

    // Créer l'inscription et mettre à jour le compteur
    const [inscription, updatedSession] = await prisma.$transaction([
      prisma.inscriptionFMPA.create({
        data: {
          sessionId,
          personnelId: data.personnelId,
          statut: 'INSCRIT',
        },
        include: {
          personnel: true,
          session: true,
        },
      }),
      prisma.sessionFMPA.update({
        where: { id: sessionId },
        data: {
          placesOccupees: {
            increment: 1,
          },
        },
      }),
    ]);

    // Envoyer une notification de confirmation
    await notificationService.notifyInscription(inscription);

    logger.info(`Inscription créée: Personnel ${data.personnelId} -> Session ${sessionId}`);
    return inscription;
  }

  async desinscrirePersonnel(sessionId: number, personnelId: number) {
    const inscription = await prisma.inscriptionFMPA.findUnique({
      where: {
        sessionId_personnelId: {
          sessionId,
          personnelId,
        },
      },
      include: {
        session: true,
      },
    });

    if (!inscription) {
      throw new NotFoundError('Inscription non trouvée');
    }

    if (inscription.session.statut === 'TERMINE') {
      throw new BusinessError('Impossible de se désinscrire d\'une session terminée');
    }

    // Supprimer l'inscription et décrémenter le compteur
    await prisma.$transaction([
      prisma.inscriptionFMPA.delete({
        where: {
          sessionId_personnelId: {
            sessionId,
            personnelId,
          },
        },
      }),
      prisma.sessionFMPA.update({
        where: { id: sessionId },
        data: {
          placesOccupees: {
            decrement: 1,
          },
        },
      }),
    ]);

    logger.info(`Désinscription: Personnel ${personnelId} -> Session ${sessionId}`);
  }

  async marquerPresence(sessionId: number, data: PresenceDTO) {
    const inscription = await prisma.inscriptionFMPA.findUnique({
      where: {
        sessionId_personnelId: {
          sessionId,
          personnelId: data.personnelId,
        },
      },
      include: {
        session: {
          include: {
            typeFMPA: true,
          },
        },
      },
    });

    if (!inscription) {
      throw new NotFoundError('Inscription non trouvée');
    }

    // Calculer le montant TTA si présent
    let montantTTA = undefined;
    if (data.statut === 'PRESENT' && data.heuresValidees) {
      montantTTA = data.heuresValidees * inscription.session.tauxHoraire;
    }

    const updatedInscription = await prisma.inscriptionFMPA.update({
      where: {
        sessionId_personnelId: {
          sessionId,
          personnelId: data.personnelId,
        },
      },
      data: {
        statut: data.statut,
        signatureElectronique: data.signature,
        dateSignature: data.signature ? new Date() : undefined,
        heuresValidees: data.heuresValidees,
        montantTTA,
      },
    });

    logger.info(`Présence marquée: Personnel ${data.personnelId} -> Session ${sessionId} (${data.statut})`);
    return updatedInscription;
  }

  async exportTTA(query: ExportTTADTO) {
    const [year, month] = query.mois.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);

    const where: any = {
      session: {
        dateDebut: {
          gte: startDate,
          lte: endDate,
        },
        statut: 'TERMINE',
      },
      statut: 'PRESENT',
      heuresValidees: {
        not: null,
      },
    };

    if (query.centreId) {
      where.session.centreId = parseInt(query.centreId);
    }

    const inscriptions = await prisma.inscriptionFMPA.findMany({
      where,
      include: {
        personnel: {
          select: {
            matricule: true,
            nom: true,
            prenom: true,
          },
        },
        session: {
          include: {
            typeFMPA: true,
          },
        },
      },
      orderBy: [
        { session: { dateDebut: 'asc' } },
        { personnel: { nom: 'asc' } },
      ],
    });

    // Générer le CSV
    const csvLines = ['MATRICULE|NOM|PRENOM|DATE|HEURES|TAUX|MONTANT|CODE'];
    let montantTotal = 0;

    for (const inscription of inscriptions) {
      const date = inscription.session.dateDebut.toLocaleDateString('fr-FR');
      const ligne = [
        inscription.personnel.matricule,
        inscription.personnel.nom,
        inscription.personnel.prenom,
        date,
        inscription.heuresValidees!.toFixed(1),
        inscription.session.tauxHoraire.toFixed(2),
        inscription.montantTTA!.toFixed(2),
        inscription.session.codeTTA,
      ].join('|');
      
      csvLines.push(ligne);
      montantTotal += inscription.montantTTA!;
    }

    const csvContent = csvLines.join('\n');

    // Sauvegarder l'export
    const exportTTA = await prisma.exportTTA.create({
      data: {
        mois: startDate,
        centreId: query.centreId ? parseInt(query.centreId) : 0,
        nombreLignes: inscriptions.length,
        montantTotal,
        fichierCsv: csvContent,
        statut: 'GENERE',
      },
    });

    logger.info(`Export TTA généré: ${inscriptions.length} lignes, ${montantTotal}€`);

    return {
      id: exportTTA.id,
      nombreLignes: inscriptions.length,
      montantTotal,
      csv: csvContent,
    };
  }

  async deleteSession(id: number) {
    const session = await prisma.sessionFMPA.findUnique({
      where: { id },
      include: {
        inscriptions: true,
      },
    });

    if (!session) {
      throw new NotFoundError('Session non trouvée');
    }

    if (session.statut === 'TERMINE') {
      throw new BusinessError('Impossible de supprimer une session terminée');
    }

    if (session.inscriptions.length > 0) {
      throw new BusinessError('Impossible de supprimer une session avec des inscrits');
    }

    await prisma.sessionFMPA.delete({
      where: { id },
    });

    logger.info(`Session FMPA supprimée: ${id}`);
  }
}

export const fmpaService = new FMPAService();
