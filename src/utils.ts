import stringify from 'json-stable-stringify';

/**
 * Generates a cache key based on method name and arguments.
 * Keys are consistent regardless of object property definition order.
 *
 * @param methodName - Name of the method being called
 * @param args - Arguments passed to the method
 * @returns A string key for cache lookup
 */
export function generateCacheKey(methodName: string, args: any[]): string | undefined {
  try {
    const serializedArgs = stringify(args);
    return `${methodName}:${serializedArgs}`;
  } catch (e) {
    // If arguments can't be serialized (e.g., contain circular references),
    // fall back to a less reliable but functional approach
    return undefined;
  }
}

/**
 * Determines if a property is a method.
 *
 * @param target - The object containing the property
 * @param prop - The property name
 * @returns True if the property is a function, false otherwise
 */
export function isMethod(target: any, prop: string | symbol): boolean {
  if (typeof prop === 'symbol') {
    return typeof target[prop] === 'function';
  }

  return typeof target[prop] === 'function';
}

/**
 * Determines if a value is an object.
 *
 * @param value - The value to check
 * @returns True if the value is an object, false otherwise
 */
export function isObject(value: any): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
