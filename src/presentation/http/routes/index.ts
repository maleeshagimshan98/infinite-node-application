import { Router } from 'express';

import { AuthRoutes } from './auth.routes';
import { AuthResourceRoutes } from './auth-resource.routes';
import { AuthRoleRoutes } from './auth-role.routes';
import { HealthRoutes } from './health.routes';
import { UserRoutes } from './user.routes';

const router = Router();

router.use('/health', HealthRoutes);
router.use('/auth', AuthRoutes);
router.use('/auth/resources', AuthResourceRoutes);
router.use('/auth/roles', AuthRoleRoutes);
router.use('/users', UserRoutes);

export default router;
