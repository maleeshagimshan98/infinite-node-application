/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import ApiResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import { ErrorResponseMessages } from '@/app/core/utils/error-response-messages';
import type { APIResponse } from '@/app/core/utils/api-response/api-response';
import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';

import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';

/**
 * An error that carries an HTTP client-error status, as `http-errors` builds them (body-parser among others).
 */
interface IClientHttpError {
  status: number;
  type?: unknown;
}

/**
 * Determine whether an error rejected the request with a 4xx status before any route ran, as body-parser does for a
 * malformed or oversized body.
 *
 * @param {unknown} error - The error Express passed on.
 * @returns {boolean} True when the error carries a numeric `status` from 400 to 499.
 */
function isClientHttpError(error: unknown): error is IClientHttpError {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return false;
  }
  const { status } = error;
  return typeof status === 'number' && status >= 400 && status < 500;
}

/**
 * Build the response for a rejected request, with a fixed message: the error's own message can quote the body.
 *
 * @param {IClientHttpError} error - The client error.
 * @returns {APIResponse} 400 for a body that is not valid JSON, 413 for one over the size limit, otherwise the
 * error's status with the generic validation message.
 */
function clientErrorResponse(error: IClientHttpError): APIResponse {
  if (error.type === 'entity.parse.failed') {
    return ApiResponseUtils.apiErrorResponse(400, ErrorResponseMessages.MALFORMED_REQUEST_BODY());
  }
  if (error.type === 'entity.too.large') {
    return ApiResponseUtils.apiErrorResponse(413, ErrorResponseMessages.REQUEST_BODY_TOO_LARGE());
  }
  return ApiResponseUtils.apiErrorResponse(error.status, ErrorResponseMessages.REQUEST_VALIDATION_ERROR());
}

/**
 * Build the last-resort Express error handler, for errors that no controller caught: a body the parser rejected
 * gets its 4xx with a fixed message and is logged as a warning; anything else gets the generic 500 and is logged as
 * an error with its stack. The error's message never reaches the client. Mount it after every route and after the
 * not-found handler.
 *
 * @param {ILogger} logger - The logger the handled errors are written to.
 * @returns {ErrorRequestHandler} The error handler (four parameters, so Express recognises it as one).
 */
export const errorHandlerMiddleware = (logger: ILogger): ErrorRequestHandler => {
  return (error: unknown, req: Request, res: Response, next: NextFunction): void => {
    // Once the response has started, only Express's default handler can end it (by closing the connection).
    if (res.headersSent) {
      next(error);
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    const meta = { method: req.method, url: req.originalUrl };

    if (isClientHttpError(error)) {
      const response = clientErrorResponse(error);
      logger.logWarn(`Request rejected with ${response.getCode()}: ${message}`, {
        ...meta,
        statusCode: response.getCode(),
      });
      ApiResponseUtils.createResponse(response, res);
      return;
    }

    logger.logError(`Request failed with 500: ${message}`, {
      ...meta,
      statusCode: 500,
      stack: error instanceof Error ? error.stack : undefined,
    });
    ApiResponseUtils.createResponse(ApiResponseUtils.getServerErrorAPIResponse(), res);
  };
};
