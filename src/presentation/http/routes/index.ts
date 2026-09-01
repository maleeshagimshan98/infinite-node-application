import { Router } from 'express';

import { AuthRoutes } from './auth.routes';
import { AuthResourceRoutes } from './auth-resource.routes';
import { AuthRoleRoutes } from './auth-role.routes';
import { HealthRoutes } from './health.routes';

const router = Router();

router.use('/health', HealthRoutes);
router.use('/auth', AuthRoutes);
router.use('/auth/resources', AuthResourceRoutes);
router.use('/auth/roles', AuthRoleRoutes);

export default router;
