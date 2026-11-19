/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export interface IHTTPResponse {
  getStatus: () => string;
  setStatus: (status: string) => void;
  getCode: () => number;
  setCode: (code: number) => void;
  getMessage: () => string | undefined;
  setMessage: (message: string) => void;
  hasData: () => boolean;
  getData: () => Record<string, unknown>[];
  setData: (data: Record<string, unknown>[]) => void;
  /**
   * Convert the response's status, code, message and data to a plain object.
   *
   * @returns {Record<string, unknown>} The response as a plain object.
   */
  toJson(): Record<string, unknown>;
}
