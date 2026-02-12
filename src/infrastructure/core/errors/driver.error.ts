/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export class DriverError extends Error {
  constructor(message: string, cause?: Error) {
    super(message, { cause });
    this.name = 'DriverError';
  }
}
