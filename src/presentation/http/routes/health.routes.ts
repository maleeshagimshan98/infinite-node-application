/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import HealthController from '../controllers/health/health.controller';

const router = Router();
const healthController = new HealthController();

/**
 * GET /health - Main health check endpoint
 * Returns comprehensive health status including service latencies
 */
router.get('/', (req: Request, res: Response) => {
  healthController.check(req, res);
});

/**
 * GET /health/live - Kubernetes liveness probe
 * Quick check to see if the service process is alive
 */
router.get('/live', (req: Request, res: Response) => {
  healthController.live(req, res);
});

/**
 * GET /health/ready - Kubernetes readiness probe
 * Full check to see if the service is ready to accept traffic
 */
router.get('/ready', (req: Request, res: Response) => {
  healthController.ready(req, res);
});

export { router as HealthRoutes };
