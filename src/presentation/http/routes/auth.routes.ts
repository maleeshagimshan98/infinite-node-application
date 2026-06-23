/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Router } from 'express';

import { loginCredentailValidator } from '@/presentation/http/validators/auth/login-credential.validator';
import { forgotPasswordValidator } from '@/presentation/http/validators/auth/forgot-password.validator';
import { resetPasswordValidator } from '@/presentation/http/validators/auth/reset-password.validator';
import { userValidator } from '@/presentation/http/validators/user/user.validator';
import { container } from '@/app/core/service.container';
import type { LoginApplicationService } from '@/application/services/auth/login.application.service';
import type { AuthenticatedRequest } from '@/app/core/utils/request/authenticated-request';

import { RequestValidatorMiddleware } from '../middleware/RequestValidatorMiddleware';
import { UserValidatorMiddleware } from '../middleware/UserValidatorMiddleware';

import type { LoginController } from '../controllers/auth/login.controller';
import type { SignupController } from '../controllers/auth/signup.controller';
import type { AccountRecoveryController } from '../controllers/auth/account-recovery.controller';
import type { Request, Response } from 'express';

const router = Router();

const loginApplicationServiceProvider = (): LoginApplicationService =>
  container.resolve<LoginApplicationService>('loginApplicationService');

// Nginx auth_request endpoint — no UserValidatorMiddleware; the service handles the token itself
router.get('/validate', (req: Request, res: Response) => {
  container.resolve<LoginController>('loginController').validate(req, res);
});

router.post('/login', RequestValidatorMiddleware(loginCredentailValidator()), (req: Request, res: Response) => {
  container.resolve<LoginController>('loginController').login(req, res);
});

router.post('/refresh', (req: Request, res: Response) => {
  container.resolve<LoginController>('loginController').refresh(req, res);
});

router.get(
  '/logout',
  UserValidatorMiddleware(loginApplicationServiceProvider),
  (req: AuthenticatedRequest, res: Response) => {
    container.resolve<LoginController>('loginController').logout(req, res);
  },
);

router.post(
  '/forgot-password',
  RequestValidatorMiddleware(forgotPasswordValidator()),
  (req: Request, res: Response) => {
    container.resolve<AccountRecoveryController>('accountRecoveryController').forgotPassword(req, res);
  },
);

router.post('/reset-password', RequestValidatorMiddleware(resetPasswordValidator()), (req: Request, res: Response) => {
  container.resolve<AccountRecoveryController>('accountRecoveryController').resetPassword(req, res);
});

router.post('/register', RequestValidatorMiddleware(userValidator()), (req: Request, res: Response) => {
  container.resolve<SignupController>('signupController').register(req, res);
});

router.get('/verify-email', (req: Request, res: Response) => {
  container.resolve<SignupController>('signupController').verifyEmail(req, res);
});

export { router as AuthRoutes };
