import { ErrorResponseMessages } from '../error-response-messages';
import { APIResponse } from './api-response';

import type { ValidationError } from 'express-validator';
import type { Paginator } from '../pagination/paginator';
import type { APIResponseData } from './api-response';
import type { Response } from 'express';

const transformApiResponseData = (data: unknown): APIResponseData => {
  if (data === null || data === undefined) {
    return [];
  }
  if (Array.isArray(data)) {
    if (data.length <= 0) {
      return [];
    }
    if (Object.keys(data[0]).length > 0) {
      return data as unknown as Record<string, unknown>[];
    } else {
      return data;
    }
  }
  if (Object.keys(data as Record<string, unknown>).length > 0) {
    return [data as Record<string, unknown>];
  } else {
    return [];
  }
};

const get2xxResponseCodeFromData = (transformedData: APIResponseData): number => {
  return transformedData.length === 0 ? 204 : 200;
};

const getApiOkResponseCode = (code: number, transformedData: APIResponseData): number => {
  return code === 200 ? get2xxResponseCodeFromData(transformedData) : code;
};

const apiOkResponse = (
  code: number,
  paginated: boolean,
  page: Paginator | null,
  message: string,
  data: Record<string, unknown>[] | Record<string, unknown> | unknown = [],
): APIResponse => {
  const transformedData = transformApiResponseData(data);
  const apiResponse = new APIResponse(
    'ok',
    getApiOkResponseCode(code, transformedData),
    paginated,
    page,
    message,
    transformedData,
  );
  return apiResponse;
};

/**
 * Builds an error APIResponse, optionally carrying response headers to be applied to the client.
 *
 * @param {number} code - The HTTP status code for the error response.
 * @param {string} message - The human-readable error message.
 * @param {Record<string, unknown>[] | Record<string, unknown> | unknown} [data] - Additional error detail/data.
 * @param {Record<string, string>} [headers] - Response headers applied via `APIResponse.applyHeaders()`.
 * @returns {APIResponse} The constructed error APIResponse.
 */
const apiErrorResponse = (
  code: number,
  message: string,
  data: Record<string, unknown>[] | Record<string, unknown> | unknown = [],
  headers: Record<string, string> = {},
): APIResponse => {
  const apiResponse = new APIResponse('error', code, false, null, message, transformApiResponseData(data), headers);
  return apiResponse;
};

const getServerErrorAPIResponse = (): APIResponse => {
  return apiErrorResponse(500, ErrorResponseMessages.SERVER_ERROR());
};

/**
 * Builds a generic 503 error APIResponse for temporarily unavailable dependencies.
 *
 * @returns {APIResponse} The 503 error APIResponse.
 */
const getServiceUnavailableAPIResponse = (): APIResponse => {
  return apiErrorResponse(503, ErrorResponseMessages.SERVICE_UNAVAILABLE());
};

/**
 * Builds the client-facing response for an infrastructure failure. The message is always generic so
 * that driver/internal details (collection names, index keys, hosts) never reach the client; the full
 * error must be logged by the caller instead.
 *
 * @param {unknown} infraType - The InfrastructureErrorType of the failure (e.g. 'NETWORK_ERROR').
 * @returns {APIResponse} A 503 response for network/connection failures, otherwise a 500 response.
 */
const infrastructureErrorResponse = (infraType: unknown): APIResponse => {
  if (infraType === 'NETWORK_ERROR' || infraType === 'CONNECTION_ERROR') {
    return getServiceUnavailableAPIResponse();
  }
  return getServerErrorAPIResponse();
};

const noAuthorizationHeaderFoundResponse = (): APIResponse => {
  return apiErrorResponse(401, ErrorResponseMessages.NO_AUTHORIZATION_HEADER());
};

const invalidAuthorizationHeaderResponse = (): APIResponse => {
  return apiErrorResponse(401, ErrorResponseMessages.INVALID_AUTHORIZATION_HEADER());
};

const expiredAuthorizationHeaderResponse = (): APIResponse => {
  return apiErrorResponse(401, ErrorResponseMessages.EXPIRED_AUTHORIZATION_HEADER());
};

const authenticationErrorResponse = (message: string): APIResponse => {
  return apiErrorResponse(401, message);
};

const requestValidationFailResponse = (validationErrors: ValidationError[]): APIResponse => {
  return apiErrorResponse(400, ErrorResponseMessages.REQUEST_VALIDATION_ERROR(), validationErrors);
};

const resourceNotFoundErrorResponse = (message: string): APIResponse => {
  return apiErrorResponse(404, message);
};

const userNotFoundError = (userType: string, userId: number): APIResponse => {
  return apiErrorResponse(404, `A ${userType} with the id of ${userId} is not found`);
};

const userNotPermittedError = (detailedError: string = ''): APIResponse => {
  return apiErrorResponse(403, `The user is not permitted to perform this action.${detailedError}`);
};

/**
 * Translates an APIResponse into an Express Response: sets the status code and headers,
 * then sends the serialized body.
 *
 * @param {APIResponse} apiResponse - The APIResponse to send.
 * @param {Response} res - The Express response object to write to.
 * @returns {Response} The same Express response object, after the response has been sent.
 */
const createResponse = (apiResponse: APIResponse, res: Response): Response => {
  res.status(apiResponse.getCode());
  apiResponse.applyHeaders(res);
  res.contentType('application/json');
  res.send(apiResponse.toJson());
  return res;
};

export default {
  apiOkResponse,
  apiErrorResponse,
  getServerErrorAPIResponse,
  getServiceUnavailableAPIResponse,
  infrastructureErrorResponse,
  noAuthorizationHeaderFoundResponse,
  invalidAuthorizationHeaderResponse,
  resourceNotFoundErrorResponse,
  expiredAuthorizationHeaderResponse,
  authenticationErrorResponse,
  requestValidationFailResponse,
  userNotFoundError,
  userNotPermittedError,
  createResponse,
};
