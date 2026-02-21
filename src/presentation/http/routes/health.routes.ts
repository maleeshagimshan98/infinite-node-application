/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Router } from 'express';

import { container } from '@/app/core/service.container';

import type { HealthController } from '../controllers/health/health.controller';
import type { Request, Response } from 'express';

const router = Router();

/**
 * GET /health - Main health check endpoint
 * Returns comprehensive health status including service latencies
 */
router.get('/', (req: Request, res: Response) => {
  const healthController = container.resolve<HealthController>('healthController');
  healthController.check(req, res);
});

/**
 * GET /health/live - Kubernetes liveness probe
 * Quick check to see if the service process is alive
 */
router.get('/live', (req: Request, res: Response) => {
  const healthController = container.resolve<HealthController>('healthController');
  healthController.live(req, res);
});

/**
 * GET /health/ready - Kubernetes readiness probe
 * Full check to see if the service is ready to accept traffic
 */
router.get('/ready', (req: Request, res: Response) => {
  const healthController = container.resolve<HealthController>('healthController');
  healthController.ready(req, res);
});

export { router as HealthRoutes };
