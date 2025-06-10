/**
 *
 */

class ErrorLoggingError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ErrorLoggingError';
  }
}

export { ErrorLoggingError };
