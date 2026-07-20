/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IHTTPResponse } from '@/application/interfaces/http-response.interface';

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

  public toJson(): Record<string, unknown> {
    return {
      status: this.status,
      code: this.code,
      message: this.message,
      data: this.data,
    };
  }

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

  public getMessage(): string | undefined {
    return this.message;
  }

  public setMessage(message: string): void {
    this.message = message;
  }

  public hasData(): boolean {
    return this.data && this.data.length > 0;
  }

  public getData(): Record<string, unknown>[] {
    return this.data;
  }

  public setData(data: Record<string, unknown>[]): void {
    this.data = data;
  }
}

export { HTTPResponse };
