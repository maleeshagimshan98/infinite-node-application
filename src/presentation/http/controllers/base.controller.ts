/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Request } from 'express';
import type { APIResponse } from '@/app/core/utils/api-response/api-response';
import { Paginator } from '@/app/core/utils/pagination/paginator';
import { PaginationException } from '@/app/core/utils/pagination/pagination-exception';
import ApiResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import { ServiceError } from '@/services/base/ServiceError';

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
   * Generates an API response based on the type of service exception.
   *
   * @param {ServiceError} serviceException The service exception to handle.
   * @returns {APIResponse} The corresponding API response.
   */
  protected getServiceErrorResponse(serviceException: ServiceError): APIResponse {
    if (serviceException.type === 'USER_PERMISSION_ERROR') {
      return ApiResponseUtils.userNotPermittedError(serviceException.message);
    }
    if (serviceException.type === 'MODEL_NOT_FOUND') {
      return ApiResponseUtils.resourceNotFoundErrorResponse(serviceException.message);
    }
    if (serviceException.type === 'UNKNOWN_ERROR') {
      return ApiResponseUtils.apiErrorResponse(500, serviceException.message);
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
      if (e instanceof ServiceError) {
        this.logErrors(e);
        return this.getServiceErrorResponse(e);
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
