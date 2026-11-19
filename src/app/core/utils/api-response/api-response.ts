import type { Response } from 'express';
import type { Paginator } from '../pagination/paginator';

export type APIResponseData = Record<string, unknown>[];

class APIResponse {
  private status: string;
  private code: number;
  private paginated: boolean;
  private page: Paginator | null;
  private message: string;
  private data: APIResponseData;
  private headers: Record<string, string>;

  constructor(
    status: string,
    code: number,
    paginated: boolean,
    page: Paginator | null,
    message: string,
    data: APIResponseData = [],
    headers: Record<string, string> = {},
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

    this.headers = headers;
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

  /**
   * Serialize the response body: status, code, pagination, message and data.
   *
   * @returns {string} The body as JSON.
   */
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

  /**
   * Get the response's status.
   *
   * @returns {string} The status.
   */
  public getStatus(): string {
    return this.status;
  }

  /**
   * Set the response's status.
   *
   * @param {string} status - The new status.
   * @returns {void}
   */
  public setStatus(status: string): void {
    this.status = status;
  }

  /**
   * Get the response's HTTP status code.
   *
   * @returns {number} The status code.
   */
  public getCode(): number {
    return this.code;
  }

  /**
   * Set the response's HTTP status code.
   *
   * @param {number} code - The new status code.
   * @returns {void}
   */
  public setCode(code: number): void {
    this.code = code;
  }

  /**
   * Check whether the response is paginated.
   *
   * @returns {boolean} True when it is paginated.
   */
  public isPaginated(): boolean {
    return this.paginated;
  }

  /**
   * Set whether the response is paginated.
   *
   * @param {boolean} paginated - True when it is paginated.
   * @returns {void}
   */
  public setPaginated(paginated: boolean): void {
    this.paginated = paginated;
  }

  /**
   * Get the response's paginator.
   *
   * @returns {Paginator | null} The paginator, or null when the response is not paginated.
   */
  public getPage(): Paginator | null {
    return this.page;
  }

  /**
   * Set the response's paginator.
   *
   * @param {Paginator} page - The new paginator.
   * @returns {void}
   */
  public setPage(page: Paginator): void {
    this.page = page;
  }

  /**
   * Get the response's message.
   *
   * @returns {string} The message.
   */
  public getMessage(): string {
    return this.message;
  }

  /**
   * Set the response's message.
   *
   * @param {string} message - The new message.
   * @returns {void}
   */
  public setMessage(message: string): void {
    this.message = message;
  }

  /**
   * Get the response's data.
   *
   * @returns {APIResponseData} The data.
   */
  public getData(): APIResponseData {
    return this.data;
  }

  /**
   * Set the response's data.
   *
   * @param {APIResponseData} data - The new data.
   * @returns {void}
   */
  public setData(data: APIResponseData): void {
    this.data = data;
  }

  /**
   * Get the headers to set on the HTTP response.
   *
   * @returns {Record<string, string>} The headers, by name.
   */
  public getHeaders(): Record<string, string> {
    return this.headers;
  }

  /**
   * Set the headers to set on the HTTP response.
   *
   * @param {Record<string, string>} headers - The new headers, by name.
   * @returns {void}
   */
  public setHeaders(headers: Record<string, string>): void {
    this.headers = headers;
  }

  /**
   * Applies every header stored on this APIResponse onto an Express Response object.
   *
   * @param {Response} res - The Express response object to receive the headers.
   * @returns {void}
   */
  public applyHeaders(res: Response): void {
    for (const [name, value] of Object.entries(this.headers)) {
      res.setHeader(name, value);
    }
  }
}

export { APIResponse };
