import { Router } from 'express';

import { AuthRoutes } from './auth.routes';
import { HealthRoutes } from './health.routes';

const router = Router();

router.use('/health', HealthRoutes);
router.use('/auth', AuthRoutes);

export default router;
