/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { APIResponse } from '@/app/core/utils/api-response/api-response';
import { Paginator } from '@/app/core/utils/pagination/paginator';
import { PaginationException } from '@/app/core/utils/pagination/pagination-exception';
import { RouteParamException } from '@/app/core/utils/request/route-param-exception';
import ApiResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';
import { DomainEntityError } from '@/domain/base';

import type { Request } from 'express';

class BaseController {
  protected logErrors(exception: unknown): void {
    console.log(exception); //... temp
  }

  //... wrapValidationAndEntityRetrieval() {}

  protected saveWithTransaction(callback: () => void): boolean {
    // DB.beginTransaction();
    callback();
    // DB.commit();
    return true;
  }

  /**
   * Generates a generic API response for an infrastructure exception; its message is never exposed to the client.
   *
   * @param {InfrastructureError} infrastructureException The infrastructure exception to handle.
   * @returns {APIResponse} The corresponding API response.
   */
  protected getInfrastructureErrorResponse(infrastructureException: InfrastructureError): APIResponse {
    return ApiResponseUtils.infrastructureErrorResponse(infrastructureException.type);
  }

  /**
   * Generates an API response based on the type of service exception.
   *
   * @param {DomainServiceError} serviceException The service exception to handle.
   * @returns {APIResponse} The corresponding API response.
   */
  protected getServiceErrorResponse(serviceException: DomainServiceError): APIResponse {
    if (serviceException.type === 'USER_PERMISSION_ERROR') {
      return ApiResponseUtils.userNotPermittedError(serviceException.message);
    }
    if (serviceException.type === 'AUTHENTICATION_ERROR') {
      return ApiResponseUtils.authenticationErrorResponse(serviceException.message);
    }
    if (serviceException.type === 'NOT_FOUND') {
      return ApiResponseUtils.resourceNotFoundErrorResponse(serviceException.message);
    }
    if (serviceException.type === 'ALREADY_EXISTS') {
      return ApiResponseUtils.apiErrorResponse(400, serviceException.message);
    }
    if (serviceException.type === 'VALIDATION_ERROR') {
      return ApiResponseUtils.apiErrorResponse(400, serviceException.message, serviceException.data);
    }
    if (serviceException.type === 'INVALID_OPERATION') {
      return ApiResponseUtils.apiErrorResponse(400, serviceException.message, serviceException.data);
    }
    if (serviceException.type === 'INCOMPLETE_MODEL') {
      return ApiResponseUtils.apiErrorResponse(400, serviceException.message);
    }
    if (serviceException.type === 'MODEL_ALREADY_EXISTS') {
      return ApiResponseUtils.apiErrorResponse(400, serviceException.message);
    }
    if (serviceException.type === 'UNKNOWN_ERROR') {
      return ApiResponseUtils.apiErrorResponse(500, serviceException.message, serviceException.data);
    }
    if (serviceException.type === 'INFRASTRUCTURE_ERROR') {
      // The message is copied from the underlying infrastructure error, so it must not reach the client.
      return ApiResponseUtils.infrastructureErrorResponse(serviceException.data.type);
    }
    return ApiResponseUtils.apiErrorResponse(500, 'An unknown error occurred.');
  }

  /**
   * Wraps a callback in a try-catch block to handle exceptions.
   *
   * @param {() => Promise<APIResponse>} callback
   * @returns {Promise<APIResponse>}
   */
  protected async catchExceptionsWrapper(callback: () => Promise<APIResponse>): Promise<APIResponse> {
    try {
      return await callback();
    } catch (e: unknown) {
      if (e instanceof PaginationException) {
        this.logErrors(e);
        return ApiResponseUtils.apiErrorResponse(400, e.message);
      }
      if (e instanceof RouteParamException) {
        this.logErrors(e);
        return ApiResponseUtils.apiErrorResponse(400, e.message);
      }
      if (e instanceof DomainEntityError) {
        this.logErrors(e);
        return ApiResponseUtils.apiErrorResponse(400, e.message);
      }
      if (e instanceof DomainServiceError) {
        this.logErrors(e);
        return this.getServiceErrorResponse(e);
      }
      if (e instanceof InfrastructureError) {
        this.logErrors(e);
        return this.getInfrastructureErrorResponse(e);
      }
      this.logErrors(e);
      return ApiResponseUtils.getServerErrorAPIResponse();
    }
  }

  /**
   * Creates a paginator for the given request and total result count.
   *
   * @param {Request} request The Express request object.
   * @param {number} totalResultCount The total number of results available.
   * @returns {Paginator} A Paginator instance.
   * @throws {PaginationException}
   */
  public getPaginator(request: Request, totalResultCount: number): Paginator {
    if (!request.query.page) {
      throw new PaginationException('Please specify the page number to return the results.');
    }

    if (isNaN(Number(request.query.page))) {
      throw new PaginationException('Page number must be a number.');
    }

    if (Number(request.query.page) <= 0) {
      throw new PaginationException('Page number must be a number higher than 0.');
    }

    if (!request.query.limit) {
      throw new PaginationException('Please specify the number of results per page to return the results.');
    }

    if (isNaN(Number(request.query.limit))) {
      throw new PaginationException('Limit must be a number.');
    }

    if (Number(request.query.limit) <= 0) {
      throw new PaginationException('Limit must be a number higher than 0.');
    }

    const page = Number(request.query.page);
    const limit = Number(request.query.limit);
    const paginator = new Paginator(page, totalResultCount, limit);
    return paginator;
  }

  /**
   * Extracts and validates a route parameter as a string.
   *
   * @param {Request} request - The Express request object.
   * @param {string} paramName - The name of the route parameter to extract.
   * @returns {string} The validated string value of the route parameter.
   * @throws {RouteParamException} When the parameter is missing or is not a string.
   */
  protected getStringParam(request: Request, paramName: string): string {
    const value = request.params[paramName];
    if (typeof value !== 'string') {
      throw new RouteParamException(`Route parameter "${paramName}" is missing or invalid.`);
    }
    return value;
  }

  //   protected getDataAccessClosure(
  //     classname: string,
  //     methodName: string,
  //     ...params: unknown[]
  //   ): (...args: unknown[]) => unknown {
  //     return () => {
  //       return (classname as any)[methodName](...params);
  //     };
  //   }
}

export { BaseController };
