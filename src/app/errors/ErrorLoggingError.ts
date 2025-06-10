/**
 *
 */

class ErrorLoggingError extends Error {
  constructor(message, options) {
    super(message, options)
    this.name = "ErrorLoggingError"
  }
}

export {ErrorLoggingError}
