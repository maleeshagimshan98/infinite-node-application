/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Router } from 'express';

import { container } from '@/app/core/service.container';
import { EMAIL_LOG_RESOURCE_NAME } from '@/domain/app/email/models/email';
import type { LoginApplicationService } from '@/application/services/auth/login.application.service';
import type { AuthenticatedRequest } from '@/app/core/utils/request/authenticated-request';

import { PermissionMiddleware } from '../middleware/PermissionMiddleware';
import { UserValidatorMiddleware } from '../middleware/UserValidatorMiddleware';

import type { EmailLogController } from '../controllers/email/email-log.controller';
import type { Response } from 'express';

const router = Router();

const loginApplicationServiceProvider = (): LoginApplicationService =>
  container.resolve<LoginApplicationService>('loginApplicationService');

router.get(
  '/',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  PermissionMiddleware(EMAIL_LOG_RESOURCE_NAME, 'read'),
  (req: AuthenticatedRequest, res: Response) => {
    container.resolve<EmailLogController>('emailLogController').getAll(req, res);
  },
);

router.get(
  '/:id',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  PermissionMiddleware(EMAIL_LOG_RESOURCE_NAME, 'read'),
  (req: AuthenticatedRequest, res: Response) => {
    container.resolve<EmailLogController>('emailLogController').getById(req, res);
  },
);

export { router as EmailLogRoutes };
