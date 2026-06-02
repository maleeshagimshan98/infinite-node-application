/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export class DomainEntityError extends Error {
  /**
   * The name of the error
   *
   * @type {string}
   */
  public name: string;

  constructor(message: string) {
    super(message);
    this.name = 'DomainEntityError';
    // Restore the prototype chain in environments that transpile to ES5
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
