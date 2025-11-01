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

  private setTotalNumOfPages(): number {
    return Math.ceil(this.total / this.resultsPerPage);
  }

  private setOffset(): number {
    return this.resultsPerPage * (this.current - 1);
  }

  public getOffset(): number {
    return this.offset;
  }

  public getTotal(): number {
    return this.total;
  }

  public getCurrentPage(): number {
    return this.current;
  }

  public setCurrentPage(current: number): void {
    this.current = current;
    this.offset = this.setOffset();
  }

  public getPages(): number {
    return this.pages;
  }

  public getResultsPerPage(): number {
    return this.resultsPerPage;
  }

  public getPageResult(): { total: number; pages: number; current: number } {
    return {
      total: this.total,
      pages: this.pages,
      current: this.getCurrentPage(),
    };
  }

  public reset(): void {
    this.total = 0;
    this.resultsPerPage = 10;
    this.current = 1;
    this.offset = 0;
    this.pages = 0;
  }
}

export { Paginator };
