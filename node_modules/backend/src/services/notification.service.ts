import { prisma } from '../server';
import { emailService } from './email.service';
import { logger } from '../utils/logger';
import { FMPA_RULES } from '../utils/constants';

export class NotificationService {
  async notifyNewSession(session: any) {
    try {
      // Récupérer tous les personnels du centre
      const personnels = await prisma.personnel.findMany({
        where: {
          centreId: session.centreId,
          statut: 'ACTIF',
        },
        select: {
          id: true,
          email: true,
          nom: true,
          prenom: true,
        },
      });

      // Créer les notifications in-app
      const notifications = personnels.map(p => ({
        personnelId: p.id,
        type: 'IN_APP',
        sujet: 'Nouvelle session FMPA disponible',
        message: `Une nouvelle session ${session.typeFMPA.libelle} est programmée le ${new Date(session.dateDebut).toLocaleDateString('fr-FR')}`,
      }));

      await prisma.notification.createMany({
        data: notifications,
      });

      // Envoyer les emails
      for (const personnel of personnels) {
        await emailService.sendEmail({
          to: personnel.email,
          subject: 'Nouvelle session FMPA disponible',
          html: `
            <h2>Nouvelle session de formation</h2>
            <p>Bonjour ${personnel.prenom} ${personnel.nom},</p>
            <p>Une nouvelle session de formation est disponible :</p>
            <ul>
              <li><strong>Formation :</strong> ${session.typeFMPA.libelle}</li>
              <li><strong>Date :</strong> ${new Date(session.dateDebut).toLocaleDateString('fr-FR')}</li>
              <li><strong>Lieu :</strong> ${session.lieu}</li>
              <li><strong>Places disponibles :</strong> ${session.placesMax}</li>
            </ul>
            <p>Connectez-vous à l'application pour vous inscrire.</p>
          `,
        });
      }

      logger.info(`Notifications envoyées pour la session ${session.id}`);
    } catch (error) {
      logger.error('Erreur lors de l\'envoi des notifications:', error);
    }
  }

  async notifySessionUpdate(session: any) {
    try {
      // Récupérer les inscrits
      const inscrits = session.inscriptions.map((i: any) => i.personnel);

      for (const personnel of inscrits) {
        // Notification in-app
        await prisma.notification.create({
          data: {
            personnelId: personnel.id,
            type: 'IN_APP',
            sujet: 'Modification de session FMPA',
            message: `La session ${session.typeFMPA.libelle} du ${new Date(session.dateDebut).toLocaleDateString('fr-FR')} a été modifiée`,
          },
        });

        // Email
        await emailService.sendEmail({
          to: personnel.email,
          subject: 'Modification de votre session FMPA',
          html: `
            <h2>Modification de session</h2>
            <p>Bonjour ${personnel.prenom} ${personnel.nom},</p>
            <p>La session à laquelle vous êtes inscrit(e) a été modifiée :</p>
            <ul>
              <li><strong>Formation :</strong> ${session.typeFMPA.libelle}</li>
              <li><strong>Nouvelle date :</strong> ${new Date(session.dateDebut).toLocaleDateString('fr-FR')}</li>
              <li><strong>Lieu :</strong> ${session.lieu}</li>
              <li><strong>Statut :</strong> ${session.statut}</li>
            </ul>
            ${session.statut === 'ANNULE' ? '<p><strong>⚠️ Cette session a été annulée.</strong></p>' : ''}
          `,
        });
      }
    } catch (error) {
      logger.error('Erreur lors de l\'envoi des notifications de mise à jour:', error);
    }
  }

  async notifyInscription(inscription: any) {
    try {
      // Notification in-app
      await prisma.notification.create({
        data: {
          personnelId: inscription.personnelId,
          type: 'IN_APP',
          sujet: 'Inscription confirmée',
          message: `Votre inscription à la session ${inscription.session.typeFMPA.libelle} du ${new Date(inscription.session.dateDebut).toLocaleDateString('fr-FR')} est confirmée`,
        },
      });

      // Email de confirmation
      await emailService.sendEmail({
        to: inscription.personnel.email,
        subject: 'Confirmation d\'inscription FMPA',
        html: `
          <h2>Inscription confirmée</h2>
          <p>Bonjour ${inscription.personnel.prenom} ${inscription.personnel.nom},</p>
          <p>Votre inscription est confirmée pour :</p>
          <ul>
            <li><strong>Formation :</strong> ${inscription.session.typeFMPA.libelle}</li>
            <li><strong>Date :</strong> ${new Date(inscription.session.dateDebut).toLocaleDateString('fr-FR')}</li>
            <li><strong>Lieu :</strong> ${inscription.session.lieu}</li>
          </ul>
          <p>Vous recevrez un rappel 7 jours et 1 jour avant la session.</p>
        `,
      });
    } catch (error) {
      logger.error('Erreur lors de l\'envoi de la confirmation d\'inscription:', error);
    }
  }

  async sendSessionReminders() {
    try {
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Sessions dans 7 jours
      const sessions7Days = await prisma.sessionFMPA.findMany({
        where: {
          dateDebut: {
            gte: new Date(in7Days.setHours(0, 0, 0, 0)),
            lt: new Date(in7Days.setHours(23, 59, 59, 999)),
          },
          statut: 'CONFIRME',
        },
        include: {
          inscriptions: {
            where: { statut: 'INSCRIT' },
            include: { personnel: true },
          },
          typeFMPA: true,
        },
      });

      // Sessions demain
      const sessionsTomorrow = await prisma.sessionFMPA.findMany({
        where: {
          dateDebut: {
            gte: new Date(tomorrow.setHours(0, 0, 0, 0)),
            lt: new Date(tomorrow.setHours(23, 59, 59, 999)),
          },
          statut: 'CONFIRME',
        },
        include: {
          inscriptions: {
            where: { statut: 'INSCRIT' },
            include: { personnel: true },
          },
          typeFMPA: true,
        },
      });

      // Envoyer les rappels J-7
      for (const session of sessions7Days) {
        for (const inscription of session.inscriptions) {
          await this.sendReminder(inscription.personnel, session, 7);
        }
      }

      // Envoyer les rappels J-1
      for (const session of sessionsTomorrow) {
        for (const inscription of session.inscriptions) {
          await this.sendReminder(inscription.personnel, session, 1);
        }
      }

      logger.info(`Rappels envoyés: ${sessions7Days.length} sessions J-7, ${sessionsTomorrow.length} sessions J-1`);
    } catch (error) {
      logger.error('Erreur lors de l\'envoi des rappels:', error);
    }
  }

  private async sendReminder(personnel: any, session: any, daysBefor: number) {
    const subject = `Rappel : Formation dans ${daysBefor} jour${daysBefor > 1 ? 's' : ''}`;
    
    await prisma.notification.create({
      data: {
        personnelId: personnel.id,
        type: 'IN_APP',
        sujet: subject,
        message: `N'oubliez pas votre formation ${session.typeFMPA.libelle} le ${new Date(session.dateDebut).toLocaleDateString('fr-FR')} à ${session.lieu}`,
      },
    });

    await emailService.sendEmail({
      to: personnel.email,
      subject,
      html: `
        <h2>Rappel de formation</h2>
        <p>Bonjour ${personnel.prenom} ${personnel.nom},</p>
        <p>Nous vous rappelons votre formation prévue dans ${daysBefor} jour${daysBefor > 1 ? 's' : ''} :</p>
        <ul>
          <li><strong>Formation :</strong> ${session.typeFMPA.libelle}</li>
          <li><strong>Date :</strong> ${new Date(session.dateDebut).toLocaleDateString('fr-FR')} à ${new Date(session.dateDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</li>
          <li><strong>Lieu :</strong> ${session.lieu}</li>
        </ul>
        <p>En cas d'empêchement, merci de vous désinscrire au plus vite.</p>
      `,
    });
  }
}

export const notificationService = new NotificationService();
