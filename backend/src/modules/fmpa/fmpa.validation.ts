import { z } from 'zod';
import { StatutSession, StatutInscription } from '@prisma/client';

export const createSessionSchema = z.object({
  typeFMPAId: z.number().positive(),
  dateDebut: z.string().datetime(),
  dateFin: z.string().datetime(),
  lieu: z.string().min(1),
  placesMax: z.number().min(5).max(15),
  formateurPrincipalId: z.number().positive(),
  centreId: z.number().positive(),
  codeTTA: z.string().min(1),
  tauxHoraire: z.number().positive().optional(),
  observations: z.string().optional(),
});

export const updateSessionSchema = createSessionSchema.partial().extend({
  statut: z.nativeEnum(StatutSession).optional(),
});

export const querySessionsSchema = z.object({
  mois: z.string().optional(),
  centreId: z.string().optional(),
  statut: z.nativeEnum(StatutSession).optional(),
  formateurId: z.string().optional(),
});

export const inscriptionSchema = z.object({
  personnelId: z.number().positive(),
});

export const presenceSchema = z.object({
  personnelId: z.number().positive(),
  statut: z.nativeEnum(StatutInscription),
  signature: z.string().optional(),
  heuresValidees: z.number().positive().optional(),
});

export const exportTTASchema = z.object({
  mois: z.string().regex(/^\d{4}-\d{2}$/),
  centreId: z.string().optional(),
});

export type CreateSessionDTO = z.infer<typeof createSessionSchema>;
export type UpdateSessionDTO = z.infer<typeof updateSessionSchema>;
export type QuerySessionsDTO = z.infer<typeof querySessionsSchema>;
export type InscriptionDTO = z.infer<typeof inscriptionSchema>;
export type PresenceDTO = z.infer<typeof presenceSchema>;
export type ExportTTADTO = z.infer<typeof exportTTASchema>;
