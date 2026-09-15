/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Router } from 'express';

import { newResourceValidator, updateResourceValidator } from '@/presentation/http/validators/auth/resource.validator';
import { container } from '@/app/core/service.container';
import type { LoginApplicationService } from '@/application/services/auth/login.application.service';
import type { AuthenticatedRequest } from '@/app/core/utils/request/authenticated-request';

import { RequestValidatorMiddleware } from '../middleware/RequestValidatorMiddleware';
import { UserValidatorMiddleware } from '../middleware/UserValidatorMiddleware';

import type { ResourceController } from '../controllers/auth/resource.controller';
import type { Response } from 'express';

const router = Router();

const loginApplicationServiceProvider = (): LoginApplicationService =>
  container.resolve<LoginApplicationService>('loginApplicationService');

router.post(
  '/',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  RequestValidatorMiddleware(newResourceValidator()),
  (req: AuthenticatedRequest, res: Response) => {
    container.resolve<ResourceController>('resourceController').create(req, res);
  },
);

router.get(
  '/',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  (req: AuthenticatedRequest, res: Response) => {
    container.resolve<ResourceController>('resourceController').getAll(req, res);
  },
);

router.get(
  '/:id',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  (req: AuthenticatedRequest, res: Response) => {
    container.resolve<ResourceController>('resourceController').getById(req, res);
  },
);

router.put(
  '/:id',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  RequestValidatorMiddleware(updateResourceValidator()),
  (req: AuthenticatedRequest, res: Response) => {
    container.resolve<ResourceController>('resourceController').update(req, res);
  },
);

router.delete(
  '/:id',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  (req: AuthenticatedRequest, res: Response) => {
    container.resolve<ResourceController>('resourceController').delete(req, res);
  },
);

export { router as AuthResourceRoutes };
