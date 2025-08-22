import { Router } from 'express';
import { fmpaController } from './fmpa.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validate, validateQuery } from '../../middleware/validation.middleware';
import { 
  createSessionSchema, 
  updateSessionSchema, 
  querySessionsSchema,
  inscriptionSchema,
  presenceSchema,
  exportTTASchema 
} from './fmpa.validation';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Routes pour les sessions FMPA
router.get('/sessions', validateQuery(querySessionsSchema), fmpaController.getSessions);
router.get('/sessions/:id', fmpaController.getSessionById);
router.post('/sessions', authorize('FORMATEUR', 'CHEF_CENTRE', 'ADMIN_SDIS'), validate(createSessionSchema), fmpaController.createSession);
router.put('/sessions/:id', authorize('FORMATEUR', 'CHEF_CENTRE', 'ADMIN_SDIS'), validate(updateSessionSchema), fmpaController.updateSession);
router.delete('/sessions/:id', authorize('CHEF_CENTRE', 'ADMIN_SDIS'), fmpaController.deleteSession);

// Routes pour les signatures
router.post('/sessions/:id/signatures', authenticate, authorize('FORMATEUR', 'ADMIN_SDIS'), fmpaController.addSignature);
router.get('/sessions/:id/signatures', authenticate, fmpaController.getSignatures);

// Routes pour l'export TTA
router.get('/sessions/:id/export-tta', authenticate, authorize('FORMATEUR', 'CHEF_CENTRE', 'ADMIN_SDIS'), fmpaController.exportTTA);
router.get('/export/monthly-report', authenticate, authorize('CHEF_CENTRE', 'ADMIN_SDIS'), fmpaController.exportMonthlyReport);

// Routes pour les inscriptions
router.post('/sessions/:id/inscription', validate(inscriptionSchema), fmpaController.inscrirePersonnel);
router.delete('/sessions/:id/inscription/:personnelId', fmpaController.desinscrirePersonnel);

// Routes pour les présences (formateurs uniquement)
router.post('/sessions/:id/presence', authorize('FORMATEUR', 'CHEF_CENTRE', 'ADMIN_SDIS'), validate(presenceSchema), fmpaController.marquerPresence);

// Export TTA (chefs de centre et admins)
router.get('/export-tta', authorize('CHEF_CENTRE', 'ADMIN_SDIS'), validateQuery(exportTTASchema), fmpaController.exportTTA);

export default router;
