class ErrorResponseMessages {
  private static _SERVER_ERROR: string =
    'The server encountered an unexpected error while processing your request. Please try again later.';
  private static _SERVICE_UNAVAILABLE_ERROR: string = 'The service is temporarily unavailable. Please try again later.';
  private static _REQUEST_VALIDATION_ERROR: string =
    'The request data is invalid. Please check the provided information and try again.';
  private static _NOT_FOUND_ERROR: string = 'The requested resource could not be found.';
  private static _NO_AUTHORIZATION_HEADER_ERROR: string = 'No authorization header with a token present in the request';
  private static _INVALID_AUTHORIZATION_HEADER_ERROR: string = 'Authorization token is invalid';
  private static _EXPIRED_AUTHORIZATION_HEADER_ERROR: string = 'Authorization token is expired, login again';

  public static SERVER_ERROR(): string {
    return this._SERVER_ERROR;
  }

  public static SERVICE_UNAVAILABLE(): string {
    return this._SERVICE_UNAVAILABLE_ERROR;
  }

  public static NO_AUTHORIZATION_HEADER(): string {
    return this._NO_AUTHORIZATION_HEADER_ERROR;
  }

  public static INVALID_AUTHORIZATION_HEADER(): string {
    return this._INVALID_AUTHORIZATION_HEADER_ERROR;
  }

  public static EXPIRED_AUTHORIZATION_HEADER(): string {
    return this._EXPIRED_AUTHORIZATION_HEADER_ERROR;
  }

  public static REQUEST_VALIDATION_ERROR(): string {
    return this._REQUEST_VALIDATION_ERROR;
  }

  public static NOT_FOUND_ERROR(resource: string = '', searchKey: string = '', searchValue: string = ''): string {
    if (resource && searchKey && searchValue) {
      return `The ${resource} with the ${searchKey} equal to ${searchValue} could not be found.`;
    } else {
      return this._NOT_FOUND_ERROR;
    }
  }

  public static RESOURCE_ALREADY_EXISTS_ERROR(resource: string = '', key: string = '', value: string = ''): string {
    return `The ${resource} with the ${key} equal to ${value} already exists.`;
  }
}

export { ErrorResponseMessages };
