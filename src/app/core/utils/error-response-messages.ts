class ErrorResponseMessages {
  private static _SERVER_ERROR: string =
    'The server encountered an unexpected error while processing your request. Please try again later.';
  private static _SERVICE_UNAVAILABLE_ERROR: string = 'The service is temporarily unavailable. Please try again later.';
  private static _REQUEST_VALIDATION_ERROR: string =
    'The request data is invalid. Please check the provided information and try again.';
  private static _NOT_FOUND_ERROR: string = 'The requested resource could not be found.';
  private static _MALFORMED_REQUEST_BODY_ERROR: string = 'The request body is not valid JSON.';
  private static _REQUEST_BODY_TOO_LARGE_ERROR: string = 'The request body is too large.';
  private static _NO_AUTHORIZATION_HEADER_ERROR: string = 'No authorization header with a token present in the request';
  private static _INVALID_AUTHORIZATION_HEADER_ERROR: string = 'Authorization token is invalid';
  private static _EXPIRED_AUTHORIZATION_HEADER_ERROR: string = 'Authorization token is expired, login again';

  /**
   * Get the client-facing message for an unexpected server error (500).
   *
   * @returns {string} The message.
   */
  public static SERVER_ERROR(): string {
    return this._SERVER_ERROR;
  }

  /**
   * Get the client-facing message for a temporarily unavailable service (503).
   *
   * @returns {string} The message.
   */
  public static SERVICE_UNAVAILABLE(): string {
    return this._SERVICE_UNAVAILABLE_ERROR;
  }

  /**
   * Get the client-facing message for a request without an authorization header.
   *
   * @returns {string} The message.
   */
  public static NO_AUTHORIZATION_HEADER(): string {
    return this._NO_AUTHORIZATION_HEADER_ERROR;
  }

  /**
   * Get the client-facing message for an invalid authorization token.
   *
   * @returns {string} The message.
   */
  public static INVALID_AUTHORIZATION_HEADER(): string {
    return this._INVALID_AUTHORIZATION_HEADER_ERROR;
  }

  /**
   * Get the client-facing message for an expired authorization token.
   *
   * @returns {string} The message.
   */
  public static EXPIRED_AUTHORIZATION_HEADER(): string {
    return this._EXPIRED_AUTHORIZATION_HEADER_ERROR;
  }

  /**
   * Get the client-facing message for a request that failed validation.
   *
   * @returns {string} The message.
   */
  public static REQUEST_VALIDATION_ERROR(): string {
    return this._REQUEST_VALIDATION_ERROR;
  }

  /**
   * Get the client-facing message for a request body that is not valid JSON (400).
   *
   * @returns {string} The message.
   */
  public static MALFORMED_REQUEST_BODY(): string {
    return this._MALFORMED_REQUEST_BODY_ERROR;
  }

  /**
   * Get the client-facing message for a request body over the size limit (413).
   *
   * @returns {string} The message.
   */
  public static REQUEST_BODY_TOO_LARGE(): string {
    return this._REQUEST_BODY_TOO_LARGE_ERROR;
  }

  /**
   * Get the client-facing message for a resource that could not be found.
   *
   * @param {string} [resource] - The resource name, e.g. `Role`.
   * @param {string} [searchKey] - The field it was looked up by, e.g. `id`.
   * @param {string} [searchValue] - The value it was looked up by.
   * @returns {string} A message naming the lookup when all three are given, otherwise a generic one.
   */
  public static NOT_FOUND_ERROR(resource: string = '', searchKey: string = '', searchValue: string = ''): string {
    if (resource && searchKey && searchValue) {
      return `The ${resource} with the ${searchKey} equal to ${searchValue} could not be found.`;
    } else {
      return this._NOT_FOUND_ERROR;
    }
  }

  /**
   * Get the client-facing message for a resource that already exists.
   *
   * @param {string} [resource] - The resource name, e.g. `Role`.
   * @param {string} [key] - The unique field, e.g. `name`.
   * @param {string} [value] - The duplicate value.
   * @returns {string} The message.
   */
  public static RESOURCE_ALREADY_EXISTS_ERROR(resource: string = '', key: string = '', value: string = ''): string {
    return `The ${resource} with the ${key} equal to ${value} already exists.`;
  }
}

export { ErrorResponseMessages };
