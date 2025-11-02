import { Router } from 'express';
import type { Request, Response } from 'express';
import { RequestValidatorMiddleware } from '../middleware/RequestValidatorMiddleware';
import { loginCredentailValidator } from '../validators/auth/login-credential.validator';
import { forgotPasswordValidator } from '../validators/auth/forgot-password.validator';
import { resetPasswordValidator } from '../validators/auth/reset-password.validator';
import { userValidator } from '../validators/user/user.validator';
import LoginController from '../controllers/auth/LoginController';
import SignupController from '../controllers/auth/SignupController';
import AccountRecoveryController from '../controllers/auth/AccountRecoveryController';

const router = Router();
const loginController = new LoginController();
const accountRecoveryController = new AccountRecoveryController();
const signupController = new SignupController();

router.get('/validate', (req: Request, res: Response) => {
  loginController.validate(req, res);
});

router.post('/login', RequestValidatorMiddleware(loginCredentailValidator()), (req: Request, res: Response) => {
  loginController.login(req, res);
});

router.post(
  '/forgot-password',
  RequestValidatorMiddleware(forgotPasswordValidator()),
  (req: Request, res: Response) => {
    accountRecoveryController.forgotPassword(req, res);
  },
);

router.post('/reset-password', RequestValidatorMiddleware(resetPasswordValidator()), (req: Request, res: Response) => {
  accountRecoveryController.resetPassword(req, res);
});

router.get('/logout', (req: Request, res: Response) => {
  loginController.logout(req, res);
});

router.post('/register', RequestValidatorMiddleware(userValidator()), (req: Request, res: Response) => {
  signupController.register(req, res);
});

router.get('/verify-email', (req: Request, res: Response) => {
  signupController.verifyEmail(req, res);
});
export { router as AuthRoutes };
