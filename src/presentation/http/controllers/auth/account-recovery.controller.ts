import type { Request, Response } from 'express';
import { BaseController } from '@/presentation/http/controllers/base.controller';
import ApiResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import { matchedData } from 'express-validator';
import { AccountRecoveryService } from '@/services/auth/account-recovery.service';

class AccountRecoveryController extends BaseController {
  private accountRecoveryService: AccountRecoveryService;

  constructor() {
    super();
    this.accountRecoveryService = new AccountRecoveryService();
  }

  /**
   * Initiate password reset process
   *
   * @param {Request} req - The incoming request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>}
   */
  async forgotPassword(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const { email } = matchedData(req);
      await this.accountRecoveryService.forgotPassword(email);

      return ApiResponseUtils.apiOkResponse(201, false, null, 'Password reset code sent', null);
    });

    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Reset user password with verification code
   *
   * @param {Request} req - The incoming request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>}
   */
  async resetPassword(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const resetPasswordCred = matchedData(req);
      await this.accountRecoveryService.resetPassword(
        resetPasswordCred.email,
        resetPasswordCred.verification_code,
        resetPasswordCred.password,
      );

      return ApiResponseUtils.apiOkResponse(200, false, null, 'Password changed successfully', null);
    });

    return ApiResponseUtils.createResponse(response, res);
  }
}

export default AccountRecoveryController;
