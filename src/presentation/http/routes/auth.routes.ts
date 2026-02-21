import { Router } from 'express';

import { loginCredentailValidator } from '@/presentation/http/validators/auth/login-credential.validator';
import { forgotPasswordValidator } from '@/presentation/http/validators/auth/forgot-password.validator';
import { resetPasswordValidator } from '@/presentation/http/validators/auth/reset-password.validator';
import { userValidator } from '@/presentation/http/validators/user/user.validator';
import { container } from '@/app/core/service.container';

import { RequestValidatorMiddleware } from '../middleware/RequestValidatorMiddleware';

import type { LoginController } from '../controllers/auth/login.controller';
import type { SignupController } from '../controllers/auth/signup.controller';
import type { AccountRecoveryController } from '../controllers/auth/account-recovery.controller';
import type { Request, Response } from 'express';

const router = Router();

router.get('/validate', (req: Request, res: Response) => {
  const loginController = container.resolve<LoginController>('loginController');
  loginController.validate(req, res);
});

router.post('/login', RequestValidatorMiddleware(loginCredentailValidator()), (req: Request, res: Response) => {
  const loginController = container.resolve<LoginController>('loginController');
  loginController.login(req, res);
});

router.post(
  '/forgot-password',
  RequestValidatorMiddleware(forgotPasswordValidator()),
  (req: Request, res: Response) => {
    const accountRecoveryController = container.resolve<AccountRecoveryController>('accountRecoveryController');
    accountRecoveryController.forgotPassword(req, res);
  },
);

router.post('/reset-password', RequestValidatorMiddleware(resetPasswordValidator()), (req: Request, res: Response) => {
  const accountRecoveryController = container.resolve<AccountRecoveryController>('accountRecoveryController');
  accountRecoveryController.resetPassword(req, res);
});

router.get('/logout', (req: Request, res: Response) => {
  const loginController = container.resolve<LoginController>('loginController');
  loginController.logout(req, res);
});

router.post('/register', RequestValidatorMiddleware(userValidator()), (req: Request, res: Response) => {
  const signupController = container.resolve<SignupController>('signupController');
  signupController.register(req, res);
});

router.get('/verify-email', (req: Request, res: Response) => {
  const signupController = container.resolve<SignupController>('signupController');
  signupController.verifyEmail(req, res);
});
export { router as AuthRoutes };
