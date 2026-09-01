import { matchedData } from 'express-validator';

import ApiResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import type { SignupApplicationService } from '@/application/services/auth/signup.application.service';
import type { INewUser } from '@/domain/user/models/user';

import { BaseController } from '../base.controller';

import type { Request, Response } from 'express';
export class SignupController extends BaseController {
  private signupApplicationService: SignupApplicationService;

  constructor(signupApplicationService: SignupApplicationService) {
    super();
    this.signupApplicationService = signupApplicationService;
  }

  /**
   * Register a new user
   *
   * @param {Request} req - The incoming request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>}
   */
  async register(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const userData = matchedData<INewUser>(req);
      const result = await this.signupApplicationService.register(userData);

      return ApiResponseUtils.apiOkResponse(201, false, null, 'User registered successfully', result);
    });

    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Verify user email
   *
   * @param {Request} req - The incoming request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>}
   */
  async verifyEmail(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const verifyCred = matchedData(req);
      await this.signupApplicationService.verifyEmail(verifyCred.email);

      return ApiResponseUtils.apiOkResponse(200, false, null, 'Email verified successfully', null);
    });

    return ApiResponseUtils.createResponse(response, res);
  }
}

export default SignupController;
