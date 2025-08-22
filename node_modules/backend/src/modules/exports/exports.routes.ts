import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Routes exports (à implémenter)
router.get('/tta', authorize('CHEF_CENTRE', 'ADMIN_SDIS'), (req, res) => {
  res.json({ message: 'Export TTA' });
});

export default router;
