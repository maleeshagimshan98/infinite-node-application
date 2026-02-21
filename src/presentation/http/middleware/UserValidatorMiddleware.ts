import type { AuthenticatedRequest } from '@/app/core/utils/request/authenticated-request';
import APIResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import type { LoginService } from '@/domain/auth/service/login.service';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';

import type { NextFunction, Response } from 'express';

export const UserValidatorMiddleware =
  (loginServiceProvider: () => LoginService) =>
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      const apiResponse = APIResponseUtils.noAuthorizationHeaderFoundResponse();
      res.status(apiResponse.getCode()).send(apiResponse.toJson());
      return;
    }

    try {
      const loginService = loginServiceProvider();
      if (!loginService) {
        const apiResponse = APIResponseUtils.getServerErrorAPIResponse();
        res.status(apiResponse.getCode()).send(apiResponse.toJson());
        return;
      }
      // Use LoginService to validate token and get user data
      const userData = await loginService.validateToken(token);

      // Get full user object
      const user = await loginService.getUserById(userData.id);

      if (!user) {
        const apiResponse = APIResponseUtils.invalidAuthorizationHeaderResponse();
        res.status(apiResponse.getCode()).send(apiResponse.toJson());
        return;
      }

      req.user = user;
      next();
    } catch (error) {
      if (error instanceof DomainServiceError) {
        const apiResponse = APIResponseUtils.apiErrorResponse(401, error.message);
        res.status(apiResponse.getCode()).send(apiResponse.toJson());
        return;
      }

      // Handle unexpected errors
      const apiResponse = APIResponseUtils.invalidAuthorizationHeaderResponse();
      res.status(apiResponse.getCode()).send(apiResponse.toJson());
    }
  };
