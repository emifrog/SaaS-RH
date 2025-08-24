import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: any[];
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    });
  }

  async sendEmail(options: EmailOptions) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@sdis06.fr',
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email envoyé: ${info.messageId} à ${options.to}`);
      return info;
    } catch (error) {
      logger.error(`Erreur envoi email à ${options.to}:`, error);
      throw error;
    }
  }

  async sendBulkEmails(recipients: string[], subject: string, html: string) {
    const results = [];
    for (const recipient of recipients) {
      try {
        const result = await this.sendEmail({ to: recipient, subject, html });
        results.push({ recipient, success: true, messageId: result.messageId });
      } catch (error) {
        results.push({ recipient, success: false, error });
      }
    }
    return results;
  }
}

export const emailService = new EmailService();
