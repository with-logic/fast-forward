import stringify from 'json-stable-stringify';
import { Cache, CacheMode, FastForwardOptions, KeyTransformer } from './types';

/**
 * Generates a cache key based on method name and arguments.
 * Keys are consistent regardless of object property definition order.
 *
 * @param methodName - Name of the method being called
 * @param args - Arguments passed to the method
 * @param keyTransformer - Optional function to transform the method and arguments
 * @returns A string key for cache lookup
 */
export function generateCacheKey(
  methodName: string,
  args: any[],
  keyTransformer?: KeyTransformer
): string | undefined {
  try {
    // Apply key transformer if provided
    let method = methodName;
    let transformedArgs = args;

    if (keyTransformer) {
      const transformed = keyTransformer(methodName, args);
      method = transformed.method;
      transformedArgs = transformed.args;
    }

    // Generate the key from the (potentially transformed) method and arguments
    const serializedArgs = stringify(transformedArgs);
    return `${method}:${serializedArgs}`;
  } catch (e) {
    // If arguments can't be serialized (e.g., contain circular references),
    // fall back to undefined
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

/**
 * Type guard to check if a value is a Cache implementation.
 *
 * @param value - The value to check
 * @returns True if the value implements the Cache interface
 */
export function isCache(value: any): value is Cache {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return (
    typeof value.get === 'function' &&
    typeof value.set === 'function' &&
    typeof value.has === 'function' &&
    typeof value.delete === 'function' &&
    typeof value.clear === 'function'
  );
}

/**
 * Type guard to check if a value is FastForwardOptions.
 *
 * @param value - The value to check
 * @returns True if the value matches the FastForwardOptions interface
 */
export function isFastForwardOptions(value: any): value is FastForwardOptions {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return (
    (!value.cache || isCache(value.cache)) &&
    (!value.mode || Object.values(CacheMode).includes(value.mode)) &&
    (!value.key || typeof value.key === 'function')
  );
}

/**
 * Parses a string value into a CacheMode enum value.
 *
 * @param value - The string value to parse
 * @returns The corresponding CacheMode enum value or undefined if invalid
 */
export function parseCacheMode(value: string | undefined): CacheMode | undefined {
  if (!value || value.trim() === '') return undefined;

  switch (value.toUpperCase()) {
    case CacheMode.OFF:
      return CacheMode.OFF;
    case CacheMode.ON:
      return CacheMode.ON;
    case CacheMode.UPDATE_ONLY:
      return CacheMode.UPDATE_ONLY;
    case CacheMode.READ_ONLY:
      return CacheMode.READ_ONLY;
    default:
      return undefined;
  }
}
