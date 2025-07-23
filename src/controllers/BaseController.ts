/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Request } from 'express';
import type { APIResponse } from '../app/utils/api-response/api-response';
import { Paginator } from '../app/utils/pagination/paginator';
import { PaginationException } from '../app/utils/pagination/pagination-exception';
import ApiResponseUtils from '../app/utils/api-response/api-response-utils';

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

  protected async catchExceptionsWrapper(callback: () => Promise<APIResponse>): Promise<APIResponse> {
    try {
      return await callback();
    } catch (e: unknown) {
      if (e instanceof PaginationException) {
        this.logErrors(e);
        return ApiResponseUtils.apiErrorResponse(400, e.message);
      }
      this.logErrors(e);
      return ApiResponseUtils.getServerErrorAPIResponse();
    }
  }

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
