import { Paginator } from './paginator'; // Update the path according to your file structure
import { PaginationException } from './pagination-exception'; // Update the path

describe('Paginator', () => {
  test('should throw error if total is negative', () => {
    expect(() => new Paginator(1, -1, 10)).toThrow(PaginationException);
  });

  test('should initialize correctly with default values', () => {
    const paginator = new Paginator(1, 0);
    expect(paginator.getTotal()).toBe(0);
    expect(paginator.getResultsPerPage()).toBe(10);
    expect(paginator.getCurrentPage()).toBe(1);
    expect(paginator.getOffset()).toBe(0);
    expect(paginator.getPages()).toBe(0);
  });

  test('should initialize pages correctly', () => {
    const paginator = new Paginator(1, 25, 10);
    expect(paginator.getPages()).toBe(3);
  });

  test('should set current page correctly', () => {
    const paginator = new Paginator(1, 25, 10);
    paginator.setCurrentPage(2);
    expect(paginator.getCurrentPage()).toBe(2);
    expect(paginator.getOffset()).toBe(10);
  });

  test('should throw error if current page is greater than total pages', () => {
    expect(() => new Paginator(4, 25, 10)).toThrow(PaginationException);
  });

  test('getPageResult should return correct object', () => {
    const paginator = new Paginator(1, 25, 10);
    expect(paginator.getPageResult()).toEqual({
      total: 25,
      pages: 3,
      current: 1,
    });
  });

  test('should reset correctly', () => {
    const paginator = new Paginator(1, 25, 10);
    paginator.reset();
    expect(paginator.getTotal()).toBe(0);
    expect(paginator.getResultsPerPage()).toBe(10);
    expect(paginator.getCurrentPage()).toBe(1);
    expect(paginator.getOffset()).toBe(0);
    expect(paginator.getPages()).toBe(0);
  });

  // Additional edge cases
  test('should handle no results correctly', () => {
    const paginator = new Paginator(1, 0);
    expect(paginator.getPages()).toBe(0);
  });

  test('should handle one page of results correctly', () => {
    const paginator = new Paginator(1, 10, 10);
    expect(paginator.getPages()).toBe(1);
  });

  test('checking getOffset value', () => {
    const paginator = new Paginator(3, 100, 10);
    expect(paginator.getOffset()).toBe(20);
  });
});
