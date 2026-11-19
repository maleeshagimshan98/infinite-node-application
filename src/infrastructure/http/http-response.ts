/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IHTTPResponse } from '@/application/interfaces/infrastructure/http-response.interface';

class HTTPResponse implements IHTTPResponse {
  private status: string;
  private code: number;
  private message: string | undefined;
  private data: Record<string, unknown>[];

  constructor(status: string, code: number, message: string | undefined, data: Record<string, unknown>[] = []) {
    this.status = status;
    this.code = code;
    this.message = message;
    this.data = data;
  }

  /**
   * Convert the response's status, code, message and data to a plain object.
   *
   * @returns {Record<string, unknown>} The response as a plain object.
   */
  public toJson(): Record<string, unknown> {
    return {
      status: this.status,
      code: this.code,
      message: this.message,
      data: this.data,
    };
  }

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
   * Get the response's message.
   *
   * @returns {string | undefined} The message, or undefined when there is none.
   */
  public getMessage(): string | undefined {
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
   * Check whether the response carries any data.
   *
   * @returns {boolean} True when the data array is not empty.
   */
  public hasData(): boolean {
    return this.data && this.data.length > 0;
  }

  /**
   * Get the response's data.
   *
   * @returns {Record<string, unknown>[]} The data.
   */
  public getData(): Record<string, unknown>[] {
    return this.data;
  }

  /**
   * Set the response's data.
   *
   * @param {Record<string, unknown>[]} data - The new data.
   * @returns {void}
   */
  public setData(data: Record<string, unknown>[]): void {
    this.data = data;
  }
}

export { HTTPResponse };
