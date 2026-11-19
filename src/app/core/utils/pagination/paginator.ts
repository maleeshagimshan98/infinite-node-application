import { PaginationException } from './pagination-exception';
class Paginator {
  private total: number = 0;
  private resultsPerPage: number = 0;
  private current: number = 1;
  private pages: number = 0;
  private offset: number = 0;

  constructor(current: number = 1, total: number, resultsPerPage: number = 10) {
    if (total < 0) {
      throw new PaginationException('The total number of results must be 0 or a positive integer');
    }
    if (total === 0) {
      this.reset();
      return;
    }
    this.total = total;
    this.resultsPerPage = resultsPerPage;
    this.pages = this.setTotalNumOfPages();

    if (current > this.pages) {
      throw new PaginationException('The page number is not within the maximum range of pages');
    }
    this.current = current;
    this.offset = this.setOffset();
  }

  /**
   * Compute the number of pages for the total and the page size.
   *
   * @returns {number} The number of pages.
   */
  private setTotalNumOfPages(): number {
    return Math.ceil(this.total / this.resultsPerPage);
  }

  /**
   * Compute the offset of the current page.
   *
   * @returns {number} The number of results before the current page.
   */
  private setOffset(): number {
    return this.resultsPerPage * (this.current - 1);
  }

  /**
   * Get the offset of the current page.
   *
   * @returns {number} The number of results to skip.
   */
  public getOffset(): number {
    return this.offset;
  }

  /**
   * Get the total number of results.
   *
   * @returns {number} The total.
   */
  public getTotal(): number {
    return this.total;
  }

  /**
   * Get the current page number.
   *
   * @returns {number} The current page, from 1.
   */
  public getCurrentPage(): number {
    return this.current;
  }

  /**
   * Set the current page and recompute its offset.
   *
   * @param {number} current - The new page number, from 1.
   * @returns {void}
   */
  public setCurrentPage(current: number): void {
    this.current = current;
    this.offset = this.setOffset();
  }

  /**
   * Get the number of pages.
   *
   * @returns {number} The number of pages.
   */
  public getPages(): number {
    return this.pages;
  }

  /**
   * Get the page size.
   *
   * @returns {number} The number of results per page.
   */
  public getResultsPerPage(): number {
    return this.resultsPerPage;
  }

  /**
   * Get the pagination summary sent with a paginated response.
   *
   * @returns {{ total: number; pages: number; current: number }} The total, the number of pages and the current page.
   */
  public getPageResult(): { total: number; pages: number; current: number } {
    return {
      total: this.total,
      pages: this.pages,
      current: this.getCurrentPage(),
    };
  }

  /**
   * Reset to an empty result set: no results and no pages, on page 1, with 10 results per page.
   *
   * @returns {void}
   */
  public reset(): void {
    this.total = 0;
    this.resultsPerPage = 10;
    this.current = 1;
    this.offset = 0;
    this.pages = 0;
  }
}

export { Paginator };
