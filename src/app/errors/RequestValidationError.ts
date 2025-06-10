/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

class RequestValidationError extends Error {
  constructor(message, options) {
    super(message, options)
    this.name = "RequestValidationError"
  }
}

export  {RequestValidationError}
