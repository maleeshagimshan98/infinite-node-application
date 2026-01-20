import type { AwilixContainer } from 'awilix';
import { container } from '../../app/core/services/service.container';
import { PaginationException } from '../../app/utils/pagination/pagination-exception';
import { Paginator } from '../../app/utils/pagination/paginator';

export class BaseService {
  protected container: AwilixContainer;

  constructor() {
    this.container = container;
  }

  /**
   * Get a paginator instance for handling pagination.
   *
   * @param request {Request} - The Express request object
   * @param totalResultCount {number} - The total number of results available
   * @returns {Paginator}
   * @throws {PaginationException} - If pagination parameters are invalid
   */
  public getPaginator(page: number, limit: number, totalResultCount: number): Paginator {
    if (!page) {
      throw new PaginationException('Please specify the page number to return the results.');
    }

    if (isNaN(Number(page))) {
      throw new PaginationException('Page number must be a number.');
    }

    if (Number(page) <= 0) {
      throw new PaginationException('Page number must be a number higher than 0.');
    }

    if (!limit) {
      throw new PaginationException('Please specify the number of results per page to return the results.');
    }

    if (isNaN(Number(limit))) {
      throw new PaginationException('Limit must be a number.');
    }

    if (Number(limit) <= 0) {
      throw new PaginationException('Limit must be a number higher than 0.');
    }

    const paginator = new Paginator(page, totalResultCount, limit);
    return paginator;
  }
}
