import { prisma } from '../../server';
import * as ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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
  /**
   * Crée une nouvelle session de formation FMPA
   * @param data Données de la session à créer
   * @returns La session créée
   * @throws {BusinessError} Si les validations métier échouent
   * @throws {NotFoundError} Si une ressource requise n'est pas trouvée
   */
  async createSession(data: CreateSessionDTO) {
    try {
      logger.info(`Création d'une nouvelle session FMPA`, { data });
      
      // Validation des dates
      const dateDebut = new Date(data.dateDebut);
      const dateFin = new Date(data.dateFin);
      const maintenant = new Date();
      
      if (dateDebut >= dateFin) {
        throw new BusinessError('La date de fin doit être postérieure à la date de début');
      }
      
      if (dateDebut < maintenant) {
        throw new BusinessError('La date de début ne peut pas être dans le passé');
      }

      // Validation métier
      if (data.placesMax > FMPA_RULES.MAX_INSCRITS) {
        throw new BusinessError(`Maximum ${FMPA_RULES.MAX_INSCRITS} places par session`);
      }

      if (data.placesMax < FMPA_RULES.MIN_INSCRITS) {
        throw new BusinessError(`Minimum ${FMPA_RULES.MIN_INSCRITS} places par session`);
      }

      // Vérifier que le type de FMPA existe
      const typeFMPA = await prisma.typeFMPA.findUnique({
        where: { id: data.typeFMPAId },
      });
      
      if (!typeFMPA) {
        throw new NotFoundError('Type de FMPA non trouvé');
      }

      // Vérifier que le centre existe
      const centre = await prisma.centre.findUnique({
        where: { id: data.centreId },
      });
      
      if (!centre) {
        throw new NotFoundError('Centre non trouvé');
      }

      // Vérifier que le formateur existe et a le bon rôle
      const formateur = await prisma.personnel.findUnique({
        where: { id: data.formateurPrincipalId },
      });

      if (!formateur) {
        throw new NotFoundError('Formateur non trouvé');
      }
      
      // Vérifier que le formateur est actif
      if (formateur.statut !== 'ACTIF') {
        throw new BusinessError('Le formateur principal doit être en statut ACTIF');
      }

      // Vérifier les conflits de dates pour le formateur
      const conflitFormateur = await prisma.sessionFMPA.findFirst({
        where: {
          formateurPrincipalId: data.formateurPrincipalId,
          OR: [
            {
              dateDebut: { lte: dateFin },
              dateFin: { gte: dateDebut },
            },
          ],
          statut: { not: 'ANNULE' },
        },
      });

      if (conflitFormateur) {
        throw new BusinessError('Le formateur est déjà affecté à une autre session sur cette période');
      }

      // Créer la session
      const session = await prisma.sessionFMPA.create({
        data: {
          ...data,
          dateDebut,
          dateFin,
          statut: 'PLANIFIE',
        },
        include: {
          typeFMPA: true,
          formateurPrincipal: true,
          centre: true,
        },
      });

      // Notifier les personnels du centre
      try {
        await notificationService.notifyNewSession(session);
        logger.info(`Notification envoyée pour la nouvelle session ${session.id}`);
      } catch (error) {
        // On ne bloque pas la création si la notification échoue
        logger.error('Erreur lors de l\'envoi des notifications', { error });
      }

      logger.info(`Session FMPA créée avec succès`, { sessionId: session.id });
      return session;
      
    } catch (error) {
      logger.error('Erreur lors de la création de la session', { error, data });
      throw error; // Laisser le gestionnaire d'erreurs global gérer
    }
  }

  /**
   * Met à jour une session de formation FMPA existante
   * @param id Identifiant de la session à mettre à jour
   * @param data Données de mise à jour
   * @returns La session mise à jour
   * @throws {NotFoundError} Si la session n'est pas trouvée
   * @throws {BusinessError} Si les validations métier échouent
   */
  async updateSession(id: number, data: UpdateSessionDTO) {
    try {
      logger.info(`Mise à jour de la session FMPA`, { sessionId: id, data });
      
      // Récupérer la session existante avec les inscriptions
      const session = await prisma.sessionFMPA.findUnique({
        where: { id },
        include: {
          inscriptions: {
            select: {
              id: true,
              personnelId: true,
              statutInscription: true,
            },
          },
        },
      });

      if (!session) {
        throw new NotFoundError('Session non trouvée');
      }

      // Vérifier que la session n'est pas déjà terminée ou annulée
      if (['TERMINE', 'ANNULE'].includes(session.statut) && data.statut !== session.statut) {
        throw new BusinessError('Impossible de modifier une session terminée ou annulée');
      }

      // Validation des dates si fournies
      const dateDebut = data.dateDebut ? new Date(data.dateDebut) : new Date(session.dateDebut);
      const dateFin = data.dateFin ? new Date(data.dateFin) : new Date(session.dateFin);
      
      if (dateDebut >= dateFin) {
        throw new BusinessError('La date de fin doit être postérieure à la date de début');
      }

      // Validation du nombre de places
      const placesOccupees = session.inscriptions.filter(i => i.statutInscription === 'CONFIRME' || i.statutInscription === 'PRESENT').length;
      
      if (data.placesMax !== undefined) {
        if (data.placesMax < placesOccupees) {
          throw new BusinessError(`Impossible de réduire les places en dessous du nombre d'inscrits (${placesOccupees})`);
        }
        
        if (data.placesMax > FMPA_RULES.MAX_INSCRITS) {
          throw new BusinessError(`Maximum ${FMPA_RULES.MAX_INSCRITS} places par session`);
        }
        
        if (data.placesMax < FMPA_RULES.MIN_INSCRITS) {
          throw new BusinessError(`Minimum ${FMPA_RULES.MIN_INSCRITS} places par session`);
        }
      }

      // Vérifier les conflits de dates pour le formateur si changement de formateur ou de dates
      if (data.formateurPrincipalId || data.dateDebut || data.dateFin) {
        const formateurId = data.formateurPrincipalId || session.formateurPrincipalId;
        
        const conflitFormateur = await prisma.sessionFMPA.findFirst({
          where: {
            id: { not: id }, // Exclure la session courante
            formateurPrincipalId: formateurId,
            statut: { not: 'ANNULE' },
            OR: [
              {
                dateDebut: { lte: dateFin },
                dateFin: { gte: dateDebut },
              },
            ],
          },
        });

        if (conflitFormateur) {
          throw new BusinessError('Le formateur est déjà affecté à une autre session sur cette période');
        }
      }

      // Préparer les données de mise à jour
      const updateData: any = { ...data };
      
      // Gérer les dates si elles sont fournies
      if (data.dateDebut) updateData.dateDebut = dateDebut;
      if (data.dateFin) updateData.dateFin = dateFin;

      // Mettre à jour la session
      const updatedSession = await prisma.sessionFMPA.update({
        where: { id },
        data: updateData,
        include: {
          typeFMPA: true,
          formateurPrincipal: true,
          centre: true,
          inscriptions: {
            include: {
              personnel: {
                select: {
                  id: true,
                  nom: true,
                  prenom: true,
                  grade: true,
                  email: true,
                  telephoneMobile: true,
                  telephoneFixe: true,
                },
              },
            },
          },
        },
      });

      // Notifier les inscrits si changement important
      const changementsImportants = data.dateDebut || data.dateFin || data.lieu || data.statut;
      
      if (changementsImportants) {
        try {
          await notificationService.notifySessionUpdate(updatedSession);
          logger.info(`Notifications de mise à jour envoyées pour la session ${id}`);
        } catch (error) {
          // On ne bloque pas la mise à jour si la notification échoue
          logger.error('Erreur lors de l\'envoi des notifications de mise à jour', { error });
        }
      }

      logger.info(`Session FMPA mise à jour avec succès`, { sessionId: id });
      return updatedSession;
      
    } catch (error) {
      logger.error('Erreur lors de la mise à jour de la session', { error, sessionId: id, data });
      throw error; // Laisser le gestionnaire d'erreurs global gérer
    }
      };
  /**
   * Récupère les sessions FMPA selon les critères de recherche
   * @param query Paramètres de recherche et de pagination
   * @returns Liste des sessions correspondant aux critères avec pagination
   */
  async getSessions(query: QuerySessionsDTO) {
    try {
      logger.info('Récupération des sessions FMPA', { query });
      
      // Configuration de base de la requête
      const where: any = {};
      const include: any = {
        typeFMPA: true,
        formateurPrincipal: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            grade: true,
            email: true,
          },
        },
        centre: {
          select: {
            id: true,
            nom: true,
            code: true,
          },
        },
        _count: {
          select: {
            inscriptions: true,
          },
        },
      };

      // Filtrage par plage de dates
      if (query.dateDebut && query.dateFin) {
        where.dateDebut = {
          gte: new Date(query.dateDebut),
          lte: new Date(query.dateFin),
        };
      } 
      // Filtrage par mois (rétrocompatibilité)
      else if (query.mois) {
        const [year, month] = query.mois.split('-');
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);
        
        where.dateDebut = {
          gte: startDate,
          lte: endDate,
        };
      }

      // Filtrage par centre
      if (query.centreId) {
        where.centreId = parseInt(query.centreId);
      }

      // Filtrage par statut
      if (query.statut) {
        where.statut = query.statut;
      }

      // Filtrage par formateur
      if (query.formateurId) {
        where.formateurPrincipalId = parseInt(query.formateurId);
      }

      // Filtrage par type de FMPA
      if (query.typeFMPAId) {
        where.typeFMPAId = parseInt(query.typeFMPAId);
      }

      // Filtrage par statut d'inscription (au moins une inscription avec ce statut)
      if (query.statutInscription) {
        where.inscriptions = {
          some: {
            statutInscription: query.statutInscription,
          },
        };
      }

      // Configuration du tri
      const orderBy: any = [];
      if (query.sortBy) {
        const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';
        orderBy.push({ [query.sortBy]: sortOrder });
      } else {
        // Tri par défaut : date de début décroissante
        orderBy.push({ dateDebut: 'desc' });
      }

      // Configuration de la pagination
      const page = query.page ? parseInt(query.page.toString()) : 1;
      const pageSize = query.pageSize ? parseInt(query.pageSize.toString()) : 10;
      const skip = (page - 1) * pageSize;

      // Exécution des requêtes en parallèle pour de meilleures performances
      const [sessions, total] = await Promise.all([
        // Récupération des sessions avec pagination
        prisma.sessionFMPA.findMany({
          where,
          include,
          orderBy,
          skip,
          take: pageSize,
        }),
        // Comptage total des résultats pour la pagination
        prisma.sessionFMPA.count({ where }),
      ]);

      // Calcul des informations de pagination
      const totalPages = Math.ceil(total / pageSize);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      logger.info(`Récupération de ${sessions.length} sessions sur ${total}`, { 
        page, 
        pageSize, 
        totalPages 
      });

      return {
        data: sessions,
        pagination: {
          total,
          page,
          pageSize,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
      };
    } catch (error) {
      logger.error('Erreur lors de la récupération des sessions', { error });
      throw error;
    }
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
                nom: true,
                prenom: true,
                grade: true,
                email: true,
                telephoneMobile: true,
                telephoneFixe: true,
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

  async desinscrirePersonnel(sessionId: number, personnelId: number): Promise<void> {
    // Vérifier que le personnel est bien inscrit
    const inscription = await prisma.inscriptionFMPA.findUnique({
      where: {
        sessionFMPAId_personnelId: {
          sessionFMPAId: sessionId,
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

    // Désinscrire le personnel et mettre à jour le compteur
    await prisma.$transaction([
      prisma.inscriptionFMPA.delete({
        where: {
          sessionFMPAId_personnelId: {
            sessionFMPAId: sessionId,
            personnelId,
          },
        },
      }),
      prisma.sessionFMPA.update({
        where: { id: sessionId },
        data: { 
          nombreInscrits: { 
            decrement: 1 
          } 
        },
      }),
    ]);

    logger.info(`Désinscription: Personnel ${personnelId} -> Session ${sessionId}`);
  }

  async marquerPresence(sessionId: number, data: PresenceDTO) {
    // Vérifier que l'inscription existe
    const inscription = await prisma.inscriptionFMPA.findUnique({
      where: {
        sessionFMPAId_personnelId: {
          sessionFMPAId: sessionId,
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
      montantTTA = data.heuresValidees;
    }

    // Mettre à jour le statut de l'inscription
    const updatedInscription = await prisma.inscriptionFMPA.update({
      where: {
        sessionFMPAId_personnelId: {
          sessionFMPAId: sessionId,
          personnelId: data.personnelId,
      },
    },
    data: {
      statutInscription: data.statut,
      signatureElectronique: data.signature,
      dateSignature: data.signature ? new Date() : undefined,
      heuresValidees: data.heuresValidees,
      montantTTA,
    },
    include: {
      session: true,
    },
  });

  logger.info(`Présence marquée: Personnel ${data.personnelId} -> Session ${sessionId} (${data.statut})`);
  return updatedInscription;
}

async exportTTA(query: ExportTTADTO) {
  try {
    // Validation des dates
    if (isNaN(Date.parse(query.startDate)) || isNaN(Date.parse(query.endDate))) {
      throw new BusinessError('Les dates fournies sont invalides');
    }

    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    
    if (startDate > endDate) {
      throw new BusinessError('La date de début doit être antérieure à la date de fin');
    }
    
    // Limiter la plage de dates à 1 an maximum pour des raisons de performance
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    if (startDate < oneYearAgo) {
      throw new BusinessError('La plage de dates ne peut pas dépasser 1 an');
    }
    
    endDate.setHours(23, 59, 59, 999); // Fin de la journée

    const where: any = {
      session: {
        dateDebut: {
          gte: startDate,
          lte: endDate,
        },
        statut: 'TERMINE',
      },
      statutInscription: 'PRESENT',
      heuresValidees: {
        not: null,
      },
    };

    if (query.centreId) {
      where.session.centreId = parseInt(query.centreId);
    }

    // Récupérer les inscriptions avec les relations nécessaires
    const inscriptions = await prisma.inscriptionFMPA.findMany({
      where,
      include: {
        personnel: {
          select: {
            matricule: true,
            nom: true,
            prenom: true,
            grade: true,
            centre: {
              select: {
                nom: true,
                code: true,
              },
            },
          },
        },
        session: {
          include: {
            typeFMPA: true,
            formateurPrincipal: {
              select: {
                nom: true,
                prenom: true,
                matricule: true,
              },
            },
          },
        },
      },
      orderBy: [
        { session: { dateDebut: 'asc' } },
        { personnel: { nom: 'asc' } },
      ],
    });

    // Vérifier s'il y a des données à exporter
    if (!inscriptions || inscriptions.length === 0) {
      throw new NotFoundError('Aucune donnée à exporter pour la période sélectionnée');
    }

    logger.info(`Export TTA: ${inscriptions.length} inscriptions trouvées pour la période du ${startDate.toISOString()} au ${endDate.toISOString()}`);

    // Créer un nouveau classeur Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Export TTA');

    // Définir les en-têtes
    worksheet.columns = [
      { header: 'Matricule', key: 'matricule', width: 15 },
      { header: 'Nom', key: 'nom', width: 20 },
      { header: 'Prénom', key: 'prenom', width: 20 },
      { header: 'Grade', key: 'grade', width: 15 },
      { header: 'Centre', key: 'centre', width: 20 },
      { header: 'Code Centre', key: 'codeCentre', width: 15 },
      { header: 'Date formation', key: 'dateFormation', width: 15 },
      { header: 'Type formation', key: 'typeFormation', width: 30 },
      { header: 'Heures', key: 'heures', width: 10 },
      { header: 'Taux horaire', key: 'tauxHoraire', width: 15, style: { numFmt: '#,##0.00€' } },
      { header: 'Montant', key: 'montant', width: 15, style: { numFmt: '#,##0.00€' } },
      { header: 'Formateur', key: 'formateur', width: 30 },
      { header: 'Code TTA', key: 'codeTTA', width: 20 },
    ];

    // Ajouter les données
    for (const inscription of inscriptions) {
      const tauxHoraire = inscription.session.tauxHoraire || 0;
      const heures = inscription.heuresValidees || 0;
      const montant = tauxHoraire * heures;

      worksheet.addRow({
        matricule: inscription.personnel.matricule,
        nom: inscription.personnel.nom,
        prenom: inscription.personnel.prenom,
        grade: inscription.personnel.grade,
        centre: inscription.personnel.centre?.nom || '',
        codeCentre: inscription.personnel.centre?.code || '',
        dateFormation: format(inscription.session.dateDebut, 'dd/MM/yyyy'),
        typeFormation: inscription.session.typeFMPA?.libelle || '',
        heures: heures,
        tauxHoraire: tauxHoraire,
        montant: montant,
        formateur: `${inscription.session.formateurPrincipal.prenom} ${inscription.session.formateurPrincipal.nom}`,
        codeTTA: inscription.session.codeTTA || '',
      });
    }

    // Ajuster automatiquement la largeur des colonnes
    worksheet.columns.forEach(column => {
      if (column && column.eachCell) {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 0;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(Math.max(maxLength + 2, 10), 50);
      }
    });

    // Générer le buffer Excel
    const buffer = await workbook.xlsx.writeBuffer();
        
    logger.info(`Export TTA: Fichier généré avec succès (${buffer.byteLength} octets)`);
        
    return {
      filename: `export_tta_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`,
      buffer,
    };
  } catch (error) {
    logger.error('Erreur lors de la génération de l\'export TTA', { error });
        
    if (error instanceof Error) {
      // Si c'est une erreur métier déjà gérée, on la propage
      if (error instanceof BusinessError || error instanceof NotFoundError) {
        throw error;
      }
      // Pour les autres erreurs, on renvoie un message générique
      throw new Error('Une erreur est survenue lors de la génération de l\'export');
    }
        
    throw new Error('Erreur inconnue lors de la génération de l\'export');
  }
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

  // Supprimer les inscriptions associées
  await prisma.inscriptionFMPA.deleteMany({
    where: { sessionFMPAId: id },
  });

  await prisma.sessionFMPA.delete({
    where: { id },
  });

  logger.info(`Session FMPA supprimée: ${id}`);
}
}

export const fmpaService = new FMPAService();
