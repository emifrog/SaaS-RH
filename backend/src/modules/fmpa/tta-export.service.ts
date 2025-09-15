import { Prisma, StatutSession, StatutInscription } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { format, subYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { prisma } from '../../server';
import { logger } from '../../utils/logger';

// Types personnalisés pour les requêtes Prisma avec relations
type SessionWithRelations = Prisma.SessionFMPAGetPayload<{
  include: {
    typeFMPA: true;
    formateurPrincipal: {
      include: {
        centre: true;
      };
    };
    inscriptions: {
      include: {
        personnel: {
          include: {
            centre: true;
          };
        };
      };
    };
    signatures: {
      include: {
        personnel: true;
      };
    };
    centre: true;
  };
}>;

export class ExportError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ExportError';
  }
}

// Types Prisma pour les sessions avec relations - Types non utilisés, supprimés pour éviter les erreurs TypeScript

export class TTAExportService {
  private validateSessionId(sessionId: string): number {
    const id = parseInt(sessionId, 10);
    if (isNaN(id) || id <= 0) {
      throw new ExportError(
        'INVALID_SESSION_ID',
        'ID de session invalide',
        { sessionId }
      );
    }
    return id;
  }

  private validateSession(session: SessionWithRelations | null): asserts session is SessionWithRelations {
    if (!session) {
      throw new ExportError('SESSION_NOT_FOUND', 'Session non trouvée');
    }

    if (!session.typeFMPA) {
      throw new ExportError('MISSING_TYPE_FMPA', 'Le type de FMPA est manquant pour cette session', {
        sessionId: session.id
      });
    }

    if (!session.formateurPrincipal) {
      throw new ExportError('MISSING_FORMATEUR', 'Aucun formateur principal défini pour cette session', {
        sessionId: session.id
      });
    }
    
    // Ensure required arrays are initialized
    session.inscriptions = session.inscriptions || [];
    session.signatures = session.signatures || [];
  }

  async generateTTAExport(sessionId: string): Promise<Buffer> {
    const id = this.validateSessionId(sessionId);
    
    logger.info(`Génération de l'export TTA pour la session ${id}`, { sessionId: id });
    
    try {
      // Récupérer la session avec toutes les relations nécessaires
      const session = await prisma.sessionFMPA.findUnique({
        where: { id },
        include: {
          typeFMPA: true,
          formateurPrincipal: {
            include: {
              centre: true,
            },
          },
          inscriptions: {
            where: { 
              statut: StatutInscription.INSCRIT
            },
            include: { 
              personnel: {
                include: {
                  centre: true,
                },
              },
            },
          },
          signatures: { 
            include: { 
              personnel: true 
            } 
          },
          centre: true,
        },
      });

      if (!session) {
        throw new ExportError('SESSION_NOT_FOUND', 'Session non trouvée', { sessionId: id });
      }

      // Type assertion pour indiquer à TypeScript que la session a les relations chargées
      const sessionWithRelations = session as unknown as SessionWithRelations;
      this.validateSession(sessionWithRelations);
      
      // Vérifier que la session est terminée
      if (session.statut !== StatutSession.TERMINE) {
        logger.warn(`Tentative d'export TTA pour une session non terminée: ${session.statut}`, {
          sessionId: session.id,
          status: session.statut
        });
        
        throw new ExportError(
          'SESSION_NOT_COMPLETED',
          'La session doit être terminée pour générer un export TTA',
          { status: session.statut }
        );
      }

    // Créer un nouveau workbook Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('TTA FMPA');

    // Configuration des colonnes
    worksheet.columns = [
      { header: 'Code TTA', key: 'codeTTA', width: 20 },
      { header: 'Type FMPA', key: 'typeFMPA', width: 30 },
      { header: 'Date début', key: 'dateDebut', width: 20 },
      { header: 'Date fin', key: 'dateFin', width: 20 },
      { header: 'Durée (heures)', key: 'duree', width: 15 },
      { header: 'Lieu', key: 'lieu', width: 30 },
      { header: 'Centre organisateur', key: 'centre', width: 25 },
    ];

    // Ajouter les informations de la session
    worksheet.addRow({
      codeTTA: session.codeTTA || `FMPA_${session.id.toString().substring(0, 8)}`,
      typeFMPA: session.typeFMPA.libelle,
      dateDebut: format(new Date(session.dateDebut), 'dd/MM/yyyy HH:mm', { locale: fr }),
      dateFin: format(new Date(session.dateFin), 'dd/MM/yyyy HH:mm', { locale: fr }),
      duree: session.typeFMPA.dureeHeures,
      lieu: session.lieu,
      centre: session.formateurPrincipal.centre?.nom || 'Non défini',
    });

    // Ajouter une ligne vide
    worksheet.addRow([]);

    // Section Formateurs
    worksheet.addRow(['FORMATEURS']);
    worksheet.addRow(['Matricule', 'Grade', 'Nom', 'Prénom', 'Centre', 'Rôle', 'Taux horaire']);

      // Ajouter une ligne pour le formateur principal
      worksheet.addRow({
        codeTTA: '',
        typeFMPA: 'Formateur principal:',
        dateDebut: session.formateurPrincipal.nom,
        dateFin: session.formateurPrincipal.prenom,
        duree: session.formateurPrincipal.email || '',
        lieu: session.formateurPrincipal.centre?.telephone || '',
        centre: '',
      });

      // Détails du formateur principal
      worksheet.addRow([
        session.formateurPrincipal.matricule,
        session.formateurPrincipal.gradeId?.toString() || '',
        session.formateurPrincipal.nom,
        session.formateurPrincipal.prenom,
        session.formateurPrincipal.centre?.nom || '',
        'Principal',
        session.tauxHoraire || 0,
      ]);

    // Formateurs assistants - Commenté car non implémenté dans le schéma
    // TODO: Ajouter la relation formateursAssistants si nécessaire
    // if (session.formateursAssistants && session.formateursAssistants.length > 0) {
    //   for (const assistant of session.formateursAssistants) {
    //     worksheet.addRow([
    //       assistant.personnel.matricule,
    //       assistant.personnel.grade,
    //       assistant.personnel.nom,
    //       assistant.personnel.prenom,
    //       assistant.personnel.centre?.nom || '',
    //       'Assistant',
    //       session.tauxHoraire,
    //     ]);
    //   }
    // }

    // Ajouter une ligne vide
    worksheet.addRow([]);

    // Section Participants
    worksheet.addRow(['PARTICIPANTS']);
    worksheet.addRow(['Nom', 'Prénom', 'Matricule', 'Centre', 'Présent', 'Signature']);

    // Ajouter les participants
    if (session.inscriptions && session.inscriptions.length > 0) {
      for (const inscription of session.inscriptions) {
        const signature = session.signatures?.find(
          (s) => s.personnelId === inscription.personnelId && s.type === 'EMARGEMENT'
        );

        worksheet.addRow([
          inscription.personnel?.nom || '',
          inscription.personnel?.prenom || '',
          inscription.personnel?.matricule || '',
          inscription.personnel?.centre?.nom || '',
          'OUI', // Tous les inscrits sont considérés comme présents
          signature ? 'OUI' : 'NON',
        ]);
      }
    }

    // Ajouter une ligne vide
    worksheet.addRow([]);

    // Section Statistiques
    worksheet.addRow(['STATISTIQUES']);
    worksheet.addRow(['Nombre d\'inscrits:', session.inscriptions.length]);
    
    // Compter les présents et absents
    if (session.inscriptions && session.inscriptions.length > 0) {
      const signatureCount = session.inscriptions.filter(i => 
        session.signatures?.some(s => s.personnelId === i.personnelId && s.type === 'EMARGEMENT')
      ).length;
      
      // Tous les inscrits sont considérés comme présents par défaut
      const presentCount = session.inscriptions.length;
      const absentCount = 0;
      
      worksheet.addRow(['Présents:', presentCount]);
      worksheet.addRow(['Absents:', absentCount]);
      worksheet.addRow(['Signatures:', signatureCount]);
    }

    // Ajouter une ligne vide
    worksheet.addRow([]);

    // Section Validation
    worksheet.addRow(['VALIDATION']);
    worksheet.addRow(['Date export', format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })]);
    worksheet.addRow(['Statut session', session.statut]);

    const validationFormateur = session.signatures?.find(
      s => s.personnelId === session.formateurPrincipalId && s.type === 'VALIDATION'
    );
    worksheet.addRow(['Validation formateur', validationFormateur ? 'OUI' : 'NON']);

    // Mise en forme
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(4).font = { bold: true, size: 12 };
    worksheet.getRow(5).font = { bold: true };

    const participantsRow = worksheet.getRow(Math.max(1, worksheet.rowCount - (session.inscriptions?.length || 0) - 6));
    participantsRow.font = { bold: true, size: 12 };

    const statsRow = worksheet.getRow(worksheet.rowCount - 7);
    statsRow.font = { bold: true, size: 12 };

    const validationRow = worksheet.getRow(worksheet.rowCount - 3);
    validationRow.font = { bold: true, size: 12 };

    // Ajuster la largeur des colonnes
    worksheet.columns.forEach((column: any) => {
      column.width = Math.max(column.width || 10, 15);
    });

    try {
      // Générer le buffer Excel
      const buffer = await workbook.xlsx.writeBuffer();
      
      logger.info(`Export TTA généré avec succès pour la session ${session.id}`, {
        sessionId: session.id,
        inscriptionsCount: session.inscriptions?.length || 0
      });
      
      return Buffer.from(buffer);
    } catch (error) {
      logger.error('Erreur lors de la génération du fichier Excel', {
        sessionId: session.id,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
      
      throw new ExportError(
        'EXCEL_GENERATION_ERROR',
        'Une erreur est survenue lors de la génération du fichier Excel',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  async generateMonthlyTTAExport(month: number, year: number, centreId?: string): Promise<Buffer> {
    logger.info(`Génération de l'export TTA mensuel pour ${month}/${year}`, { 
      month, 
      year, 
      centreId 
    });
    
    if (month < 1 || month > 12) {
      throw new ExportError('INVALID_MONTH', 'Le mois doit être compris entre 1 et 12', { month });
    }
    
    if (year < 2000 || year > 2100) {
      throw new ExportError('INVALID_YEAR', 'L\'année est invalide', { year });
    }
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    logger.info(`Génération du rapport mensuel pour la période du ${startDate.toISOString()} au ${endDate.toISOString()}`);

    try {
      // Récupérer toutes les sessions du mois avec les relations nécessaires
      const sessions = await prisma.sessionFMPA.findMany({
        where: {
          dateDebut: { gte: startDate, lte: endDate },
          ...(centreId && { centreId: parseInt(centreId) }),
        },
        include: {
          typeFMPA: true,
          formateurPrincipal: {
            include: {
              centre: true,
            },
          },
          inscriptions: {
            where: { 
              OR: [
                { statut: StatutInscription.INSCRIT },
                { statut: StatutInscription.PRESENT }
              ]
            },
            include: { 
              personnel: {
                include: {
                  centre: true,
                },
              },
            },
          },
          centre: true,
        },
      });
      
      logger.info(`Trouvées ${sessions.length} sessions pour la période`, { 
        startDate, 
        endDate, 
        centreId,
        sessionsCount: sessions.length 
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Rapport Mensuel FMPA');

      // En-tête du rapport
      worksheet.mergeCells('A1:H1');
      worksheet.getCell('A1').value = `RAPPORT MENSUEL FMPA - ${format(startDate, 'MMMM yyyy', { locale: fr }).toUpperCase()}`;
      worksheet.getCell('A1').font = { bold: true, size: 16 };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };

      worksheet.addRow([]);

      // En-têtes des colonnes
      const headers = [
        'Date',
        'Code TTA',
        'Type FMPA',
        'Centre',
        'Formateur',
        'Participants',
        'Présents',
        'Heures',
      ];
      
      worksheet.addRow(headers);
      
      // Mise en forme de l'en-tête
      const headerRow = worksheet.getRow(3);
      headerRow.font = { bold: true };
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' }
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Variables pour les totaux
      let totalParticipants = 0;
      let totalPresents = 0;
      let totalHeures = 0;

      // Ajouter les données des sessions
      for (const session of sessions) {
        const inscriptions = session.inscriptions || [];
        const signaturesCount = session.signatures?.filter(s => s.type === 'EMARGEMENT').length || 0;
        const dureeHeures = session.typeFMPA?.dureeHeures || 0;
        
        const row = [
          format(new Date(session.dateDebut), 'dd/MM/yyyy'),
          session.codeTTA || `FMPA_${session.id}`,
          session.typeFMPA?.libelle || 'Non défini',
          session.centre?.nom || 'Non défini',
          session.formateurPrincipal ? `${session.formateurPrincipal.nom} ${session.formateurPrincipal.prenom}` : 'Non défini',
          inscriptions.length,
          signaturesCount,
          dureeHeures,
        ];
        
        worksheet.addRow(row);
        
        // Mettre à jour les totaux
        totalParticipants += inscriptions.length;
        totalPresents += signaturesCount;
        totalHeures += dureeHeures;
      }

      // Ajouter une ligne vide avant les totaux
      worksheet.addRow([]);
      
      // Ajouter les totaux
      const totalRow = [
        'TOTAUX',
        '', '', '', '', // Colonnes vides pour l'alignement
        totalParticipants,
        totalPresents,
        totalHeures,
      ];
      
      const totalRowIndex = worksheet.addRow(totalRow);
      totalRowIndex.font = { bold: true };
      
      // Mise en forme des cellules de données
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 3) { // Ignorer les en-têtes
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          });
        }
      });
      
      // Ajuster automatiquement la largeur des colonnes
      worksheet.columns.forEach(column => {
        if (column.eachCell) {
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
      
      logger.info('Export mensuel TTA généré avec succès', {
        month,
        year,
        sessionsCount: sessions.length,
        totalParticipants,
        totalPresents,
        totalHeures
      });
      
      return Buffer.from(buffer);
      
    } catch (error) {
      logger.error('Erreur lors de la génération de l\'export mensuel TTA', {
        month,
        year,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      throw new ExportError(
        'MONTHLY_EXPORT_ERROR',
        'Une erreur est survenue lors de la génération de l\'export mensuel',
        { 
          originalError: error instanceof Error ? error.message : String(error),
          month,
          year 
        }
      );
    }
  const inscriptionsCount = inscriptions.length;
  
  // On considère que tous les inscrits sont présents par défaut
  const presentCount = inscriptionsCount;
  totalParticipants += inscriptionsCount;
  totalPresents += presentCount;
  totalHeures += session.typeFMPA.dureeHeures;

  const dureeHeures = Math.round(
    (new Date(session.dateFin).getTime() - new Date(session.dateDebut).getTime()) / (1000 * 60 * 60)
  );
  
  worksheet.addRow({
    date: format(new Date(session.dateDebut), 'dd/MM/yyyy', { locale: fr }),
    codeTTA: session.codeTTA || `SESS_${session.id}`,
    type: session.typeFMPA?.libelle || 'Type inconnu',
    centre: session.centre?.nom || `Centre ${session.centreId || 'Inconnu'}`,
    formateur: session.formateurPrincipal ? 
      `${session.formateurPrincipal.nom} ${session.formateurPrincipal.prenom}` : 
      'Non défini',
    participants: inscriptionsCount,
    presents: presentCount,
    heures: dureeHeures,
  });
      codeTTA: '',
      type: `${sessions.length} sessions`,
      centre: '',
      formateur: '',
      participants: totalParticipants,
      presents: totalPresents,
      heures: totalHeures,
    });
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Statistiques
    worksheet.addRow([]);
    worksheet.addRow([]);
    worksheet.addRow(['STATISTIQUES DU MOIS']);
    worksheet.addRow(['Nombre de sessions', sessions.length]);
    worksheet.addRow(['Total participants', totalParticipants]);
    worksheet.addRow(['Total présents', totalPresents]);
    worksheet.addRow(['Taux de présence moyen', totalParticipants > 0 ? `${Math.round((totalPresents / totalParticipants) * 100)}%` : '0%']);
    worksheet.addRow(['Total heures formation', totalHeures]);

    // Mise en forme
    worksheet.getRow(3).font = { bold: true };
    worksheet.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(3).font = { color: { argb: 'FFFFFFFF' } };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
