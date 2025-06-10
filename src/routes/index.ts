import { Router } from 'express';
import { UserRoutes } from './users.routes';
import { AuthRoutes } from './auth.routes';

const router = Router();

router.use('/users', UserRoutes);
router.use('/auth', AuthRoutes);

export default router;
