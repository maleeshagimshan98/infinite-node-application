/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import ApiResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import { ErrorResponseMessages } from '@/app/core/utils/error-response-messages';

import type { Request, RequestHandler, Response } from 'express';

/**
 * Build the handler that answers every request no route matched with a JSON 404. Mount it after all routes.
 *
 * @returns {RequestHandler} The not-found handler.
 */
export const notFoundMiddleware = (): RequestHandler => {
  return (_req: Request, res: Response): void => {
    ApiResponseUtils.createResponse(
      ApiResponseUtils.resourceNotFoundErrorResponse(ErrorResponseMessages.NOT_FOUND_ERROR()),
      res,
    );
  };
};
