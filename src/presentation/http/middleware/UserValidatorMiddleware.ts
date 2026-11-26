import type { AuthenticatedRequest } from '@/app/core/utils/request/authenticated-request';
import APIResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import type { LoginApplicationService } from '@/application/services/auth/login.application.service';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';

import type { NextFunction, Response } from 'express';

/**
 * Build a middleware that authenticates the request by its Bearer access token and sets `req.user`. A missing,
 * invalid or expired token is answered with a 401; an infrastructure outage with a generic 503 / 500.
 *
 * @param {() => LoginApplicationService} loginApplicationServiceProvider - Resolves the login application service
 * when a request arrives.
 * @returns {(req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>} The middleware.
 */
export const UserValidatorMiddleware =
  (loginApplicationServiceProvider: () => LoginApplicationService) =>
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      const apiResponse = APIResponseUtils.noAuthorizationHeaderFoundResponse();
      APIResponseUtils.createResponse(apiResponse, res);
      return;
    }

    try {
      const loginApplicationService = loginApplicationServiceProvider();
      if (!loginApplicationService) {
        const apiResponse = APIResponseUtils.getServerErrorAPIResponse();
        APIResponseUtils.createResponse(apiResponse, res);
        return;
      }
      // Validate the token (cache-backed) and resolve the full user object
      const userData = await loginApplicationService.validate(token);

      const user = await loginApplicationService.getUserById(userData.id);

      if (!user) {
        const apiResponse = APIResponseUtils.invalidAuthorizationHeaderResponse();
        APIResponseUtils.createResponse(apiResponse, res);
        return;
      }

      req.user = user;
      next();
    } catch (error) {
      if (error instanceof DomainServiceError) {
        // A dependency outage is not an authentication failure, and its message is infrastructure-internal.
        const apiResponse =
          error.type === 'INFRASTRUCTURE_ERROR'
            ? APIResponseUtils.infrastructureErrorResponse(error.data.type)
            : APIResponseUtils.apiErrorResponse(401, error.message);
        APIResponseUtils.createResponse(apiResponse, res);
        return;
      }

      // Handle unexpected errors
      const apiResponse = APIResponseUtils.invalidAuthorizationHeaderResponse();
      APIResponseUtils.createResponse(apiResponse, res);
    }
  };
