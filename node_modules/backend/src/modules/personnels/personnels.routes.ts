import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Routes personnels (à implémenter)
router.get('/', authorize('CHEF_CENTRE', 'ADMIN_SDIS'), (req, res) => {
  res.json({ message: 'Liste des personnels' });
});

export default router;
