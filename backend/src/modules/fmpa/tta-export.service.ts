import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { prisma } from '../../server';

// Types Prisma pour les sessions avec relations - Types non utilisés, supprimés pour éviter les erreurs TypeScript

export class TTAExportService {
  async generateTTAExport(sessionId: string): Promise<Buffer> {
    // Récupérer la session avec toutes les relations nécessaires
    const session = await prisma.sessionFMPA.findUnique({
      where: { id: parseInt(sessionId) },
      include: {
        typeFMPA: true,
        formateurPrincipal: {
          include: {
            centre: true,
          },
        },
        inscriptions: {
          where: { 
            statut: 'INSCRIT'
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
      },
    });

    if (!session) {
      throw new Error('Session non trouvée');
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

    // Ajouter les informations du formateur principal
    if (session.formateurPrincipal) {
      worksheet.addRow({
        codeTTA: '',
        typeFMPA: 'Formateur principal:',
        dateDebut: session.formateurPrincipal.nom,
        dateFin: session.formateurPrincipal.prenom,
        duree: session.formateurPrincipal.email,
        lieu: session.formateurPrincipal.telephone || '',
        centre: '',
      });
    }

    // Formateur principal
    worksheet.addRow([
      session.formateurPrincipal.matricule,
      session.formateurPrincipal.grade,
      session.formateurPrincipal.nom,
      session.formateurPrincipal.prenom,
      session.formateurPrincipal.centre?.nom || '',
      'Principal',
      session.tauxHoraire,
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
          (s: any) => s.personnelId === inscription.personnelId && s.type === 'EMARGEMENT'
        );

        worksheet.addRow([
          inscription.personnel.nom,
          inscription.personnel.prenom,
          inscription.personnel.matricule,
          inscription.personnel.centre?.nom || '',
          inscription.present ? 'OUI' : 'NON',
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
      const signatureCount = session.inscriptions?.filter((i: any) => session.signatures?.find((s: any) => s.personnelId === i.personnelId && s.type === 'EMARGEMENT')).length || 0;
      const presentCount = session.inscriptions?.filter((i: any) => i.present).length || 0;
      const absentCount = session.inscriptions?.filter((i: any) => !i.present).length || 0;
      
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

    const validationFormateur = session.signatures.find(
      s => s.personnelId === session.formateurPrincipalId && s.type === 'VALIDATION'
    );
    worksheet.addRow(['Validation formateur', validationFormateur ? 'OUI' : 'NON']);

    // Mise en forme
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(4).font = { bold: true, size: 12 };
    worksheet.getRow(5).font = { bold: true };

    const participantsRow = worksheet.getRow(worksheet.rowCount - session.inscriptions.length - 6);
    participantsRow.font = { bold: true, size: 12 };

    const statsRow = worksheet.getRow(worksheet.rowCount - 7);
    statsRow.font = { bold: true, size: 12 };

    const validationRow = worksheet.getRow(worksheet.rowCount - 3);
    validationRow.font = { bold: true, size: 12 };

    // Ajuster la largeur des colonnes
    worksheet.columns.forEach((column: any) => {
      column.width = Math.max(column.width || 10, 15);
    });

    // Générer le buffer Excel
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generateMonthlyReport(month: number, year: number, centreId?: string): Promise<Buffer> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Récupérer toutes les sessions du mois
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
          where: { statut: 'INSCRIT' },
          include: { 
            personnel: {
              include: {
                centre: true,
              },
            },
          },
        },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rapport Mensuel FMPA');

    // En-tête du rapport
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = `RAPPORT MENSUEL FMPA - ${format(startDate, 'MMMM yyyy', { locale: fr }).toUpperCase()}`;
    worksheet.getCell('A1').font = { bold: true, size: 16 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.addRow([]);

    // Colonnes
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Code TTA', key: 'codeTTA', width: 20 },
      { header: 'Type FMPA', key: 'type', width: 25 },
      { header: 'Centre', key: 'centre', width: 20 },
      { header: 'Formateur', key: 'formateur', width: 25 },
      { header: 'Participants', key: 'participants', width: 15 },
      { header: 'Présents', key: 'presents', width: 12 },
      { header: 'Heures', key: 'heures', width: 10 },
    ];

    // Ajouter les données des sessions
    let totalParticipants = 0;
    let totalPresents = 0;
    let totalHeures = 0;

    for (const session of sessions) {
      const presentCount = session.inscriptions?.filter((i: any) => i.present).length || 0;
      const absentCount = session.inscriptions?.filter((i: any) => !i.present).length || 0;
      totalParticipants += session.inscriptions.length;
      totalPresents += presentCount;
      totalHeures += session.typeFMPA.dureeHeures;

      const dureeHeures = Math.round(
        (session.dateFin.getTime() - session.dateDebut.getTime()) / (1000 * 60 * 60)
      );

      worksheet.addRow({
        date: format(new Date(session.dateDebut), 'dd/MM/yyyy', { locale: fr }),
        codeTTA: session.codeTTA,
        type: session.typeFMPA.libelle,
        centre: `Centre ${session.centreId}`,
        formateurPrincipal: session.formateurPrincipal ? `${session.formateurPrincipal.nom} ${session.formateurPrincipal.prenom}` : 'N/A',
        participants: session.inscriptions.length,
        presents: presentCount,
        heures: dureeHeures,
      });
    }

    // Ligne de total
    worksheet.addRow([]);
    const totalRow = worksheet.addRow({
      date: 'TOTAL',
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
