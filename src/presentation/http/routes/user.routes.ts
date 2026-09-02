/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Router } from 'express';

import { newUserValidator, updateUserValidator } from '@/presentation/http/validators/user/user.validator';
import { container } from '@/app/core/service.container';
import type { LoginApplicationService } from '@/application/services/auth/login.application.service';
import type { AuthenticatedRequest } from '@/app/core/utils/request/authenticated-request';

import { RequestValidatorMiddleware } from '../middleware/RequestValidatorMiddleware';
import { UserValidatorMiddleware } from '../middleware/UserValidatorMiddleware';

import type { UserController } from '../controllers/user/user.controller';
import type { Response } from 'express';

const router = Router();

const loginApplicationServiceProvider = (): LoginApplicationService =>
  container.resolve<LoginApplicationService>('loginApplicationService');

router.post(
  '/',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  RequestValidatorMiddleware(newUserValidator()),
  (req: AuthenticatedRequest, res: Response) => {
    container.resolve<UserController>('userController').create(req, res);
  },
);

router.get(
  '/',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  (req: AuthenticatedRequest, res: Response) => {
    container.resolve<UserController>('userController').getAll(req, res);
  },
);

router.get(
  '/:id',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  (req: AuthenticatedRequest, res: Response) => {
    container.resolve<UserController>('userController').getById(req, res);
  },
);

router.put(
  '/:id',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  RequestValidatorMiddleware(updateUserValidator()),
  (req: AuthenticatedRequest, res: Response) => {
    container.resolve<UserController>('userController').update(req, res);
  },
);

router.delete(
  '/:id',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  (req: AuthenticatedRequest, res: Response) => {
    container.resolve<UserController>('userController').delete(req, res);
  },
);

export { router as UserRoutes };
