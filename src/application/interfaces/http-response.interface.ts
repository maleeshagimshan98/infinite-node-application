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
  toJson(): Record<string, unknown>;
}
