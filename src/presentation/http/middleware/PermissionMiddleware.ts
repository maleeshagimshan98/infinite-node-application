/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AuthenticatedRequest } from '@/app/core/utils/request/authenticated-request';
import ApiResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import type { PermissionAction } from '@/domain/auth/models/role';

import type { NextFunction, Response } from 'express';

/**
 * Build a middleware that lets a request through only when the authenticated user's role grants an action on a
 * resource. Place it after `UserValidatorMiddleware`, which loads the user with its role and the role's resources.
 * A request without a user is refused too, so a route that forgets the authentication middleware stays closed.
 *
 * @param {string} resourceName - The resource the route protects, e.g. `email-logs`.
 * @param {PermissionAction} action - The action the route performs on it.
 * @returns {(req: AuthenticatedRequest, res: Response, next: NextFunction) => void} The middleware; it answers 403
 * when the user lacks the permission.
 */
export const PermissionMiddleware =
  (resourceName: string, action: PermissionAction) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (req.user?.hasPermission(resourceName, action) !== true) {
      ApiResponseUtils.createResponse(ApiResponseUtils.userNotPermittedError(), res);
      return;
    }
    next();
  };
