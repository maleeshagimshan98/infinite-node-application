/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { matchedData } from 'express-validator';

import APIResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import type { LoginApplicationService } from '@/application/services/auth/login.application.service';
import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';

import { BaseController } from '../base.controller';

import type { Request, Response } from 'express';

const REFRESH_TOKEN_COOKIE = 'refresh_token';

export class LoginController extends BaseController {
  private loginApplicationService: LoginApplicationService;

  constructor(loginApplicationService: LoginApplicationService, logger: ILogger) {
    super(logger);
    this.loginApplicationService = loginApplicationService;
  }

  /**
   * Authenticate the user. Sets the access token as a Bearer header and the
   * refresh token as an httpOnly cookie.
   */
  async login(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const credentials = matchedData(req);
      const result = await this.loginApplicationService.login(credentials.email, credentials.password);

      res.setHeader('Authorization', `Bearer ${result.accessToken}`);
      res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      return APIResponseUtils.apiOkResponse(201, false, null, 'Logged in successfully', {
        id: result.id,
        status: result.status,
      });
    });

    return APIResponseUtils.createResponse(response, res);
  }

  /**
   * Validate the access token. Called by Nginx auth_request.
   * On success sets X-User-Id and X-User-Groups forwarding headers.
   */
  async validate(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const token = req.headers.authorization?.split(' ')[1];
      const result = await this.loginApplicationService.validate(token ?? '');

      res.setHeader('X-User-Id', result.id);
      res.setHeader('X-User-Groups', result.groups);

      return APIResponseUtils.apiOkResponse(200, false, null, 'Token is valid', { id: result.id });
    });

    return APIResponseUtils.createResponse(response, res);
  }

  /**
   * Refresh the access and refresh tokens. The old login record is expired
   * and a new one is created.
   */
  async refresh(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const accessToken = req.headers.authorization?.split(' ')[1];
      const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;

      if (!accessToken || !refreshToken) {
        return APIResponseUtils.noAuthorizationHeaderFoundResponse();
      }

      const result = await this.loginApplicationService.refresh(accessToken, refreshToken);

      res.setHeader('Authorization', `Bearer ${result.accessToken}`);
      res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      return APIResponseUtils.apiOkResponse(200, false, null, 'Tokens refreshed successfully', null);
    });

    return APIResponseUtils.createResponse(response, res);
  }

  /**
   * Logout the user. Revokes the login record and clears the refresh token cookie.
   */
  async logout(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const token = req.headers.authorization?.split(' ')[1];
      await this.loginApplicationService.logout(token ?? '');

      res.clearCookie(REFRESH_TOKEN_COOKIE);

      return APIResponseUtils.apiOkResponse(200, false, null, 'User logged out successfully', null);
    });

    return APIResponseUtils.createResponse(response, res);
  }
}

export default LoginController;
