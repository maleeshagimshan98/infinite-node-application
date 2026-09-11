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

const apiErrorResponse = (
  code: number,
  message: string,
  data: Record<string, unknown>[] | Record<string, unknown> | unknown = [],
): APIResponse => {
  const apiResponse = new APIResponse('error', code, false, null, message, transformApiResponseData(data));
  return apiResponse;
};

const getServerErrorAPIResponse = (): APIResponse => {
  return apiErrorResponse(500, ErrorResponseMessages.SERVER_ERROR());
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

const createResponse = (apiResponse: APIResponse, res: Response): Response => {
  //... set status
  //... set headers
  //... set body
  res.status(apiResponse.getCode());
  res.contentType('application/json');
  res.send(apiResponse.toJson());
  return res;
};

export default {
  apiOkResponse,
  apiErrorResponse,
  getServerErrorAPIResponse,
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
