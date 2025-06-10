/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { Paginator } from '../pagination/paginator';

export type APIResponseData = Record<string, unknown>[];

class APIResponse {
  private status: string;
  private code: number;
  private paginated: boolean;
  private page: Paginator | null;
  private message: string;
  private data: APIResponseData;

  constructor(
    status: string,
    code: number,
    paginated: boolean,
    page: Paginator | null,
    message: string,
    data: APIResponseData = [],
  ) {
    this.status = status;
    this.code = code;
    this.paginated = paginated;
    this.page = page;
    this.message = message;

    if (Array.isArray(data)) {
      this.data = data;
    } else {
      throw new Error(`APIResponse: Data must be an array but received ${typeof data}`);
    }
  }

  //   private snakeCaseToCamelCase(data: Record<string, unknown>[]): Record<string, unknown>[] {
  //     const camelCased: Record<string, unknown>[] = [{}];
  //     for (const key in data) {
  //       const convertedKey = this.toCamelCase(key);
  //       const val = data[key];
  //       const convertedVal = Array.isArray(val) ? this.snakeCaseToCamelCase(val) : val;
  //       camelCased[convertedKey] = convertedVal;
  //     }
  //     return camelCased;
  //   }

  //   private toCamelCase(s: string): string {
  //     return s.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  //   }

  public toJson(): string {
    return JSON.stringify({
      status: this.status,
      code: this.code,
      paginated: this.paginated,
      page: this.page ? this.page.getPageResult() : null,
      message: this.message,
      data: this.data,
    });
  }

  //   public toCamelCaseJson(): string {
  //     const formattedData = this.snakeCaseToCamelCase(this.data);
  //     return JSON.stringify({
  //       status: this.status,
  //       code: this.code,
  //       paginated: this.paginated,
  //       page: this.page,
  //       message: this.message,
  //       data: formattedData,
  //     });
  //   }

  public getStatus(): string {
    return this.status;
  }

  public setStatus(status: string): void {
    this.status = status;
  }

  public getCode(): number {
    return this.code;
  }

  public setCode(code: number): void {
    this.code = code;
  }

  public isPaginated(): boolean {
    return this.paginated;
  }

  public setPaginated(paginated: boolean): void {
    this.paginated = paginated;
  }

  public getPage(): Paginator | null {
    return this.page;
  }

  public setPage(page: Paginator): void {
    this.page = page;
  }

  public getMessage(): string {
    return this.message;
  }

  public setMessage(message: string): void {
    this.message = message;
  }

  public getData(): APIResponseData {
    return this.data;
  }

  public setData(data: APIResponseData): void {
    this.data = data;
  }
}

export { APIResponse };
