import type { Request } from 'express';
import { PaginationException } from '../../app/utils/pagination/pagination-exception';
import { Paginator } from '../../app/utils/pagination/paginator';

export class BaseService {
  constructor() {
    // Initialization code if needed
  }

  /**
   * Get a paginator instance for handling pagination.
   *
   * @param request {Request} - The Express request object
   * @param totalResultCount {number} - The total number of results available
   * @returns {Paginator}
   * @throws {PaginationException} - If pagination parameters are invalid
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
}
