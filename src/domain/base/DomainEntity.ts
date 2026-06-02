/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

/**
 * Base class for all domain entities
 * Provides automatic JSON serialization by reading getters
 * and mapping them to clean property names without underscores
 */
export abstract class DomainEntity {
  /**
   * Convert domain entity to JSON object
   * Automatically serializes all getters to clean property names
   *
   * @returns {object} JSON representation of the domain entity
   */
  public toJSON(): Record<string, unknown> {
    const json: Record<string, unknown> = {};

    let currentPrototype = Object.getPrototypeOf(this);
    const getters = new Set<string>();

    // Collect all getters from the entire prototype chain
    while (currentPrototype && currentPrototype !== Object.prototype) {
      Object.getOwnPropertyNames(currentPrototype).forEach((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(currentPrototype, key);
        if (descriptor && typeof descriptor.get === 'function') {
          getters.add(key);
        }
      });
      currentPrototype = Object.getPrototypeOf(currentPrototype);
    }

    // Serialize each getter
    getters.forEach((key) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = (this as any)[key];
        json[key] = DomainEntity._serializeValue(value);
      } catch {
        // Skip getters that throw errors
      }
    });

    return json;
  }

  /**
   * Recursively serialize a value to a plain object
   *
   * @param {unknown} value - The value to serialize
   * @returns {unknown} The serialized value
   */
  private static _serializeValue(value: unknown): unknown {
    if (value instanceof DomainEntity) {
      return value.toJSON();
    }
    if (Array.isArray(value)) {
      return value.map(DomainEntity._serializeValue);
    }
    return value;
  }

  /**
   * Convert to plain object (alias for toJSON)
   */
  public toObject(): Record<string, unknown> {
    return this.toJSON();
  }
}

export default DomainEntity;
