import { Cache } from './types';
import { InMemoryCache } from './in-memory-cache';
import { generateCacheKey, isMethod, isObject } from './utils';

/**
 * Wraps an object in a Proxy that caches method call results.
 *
 * @template T - The type of the object being wrapped
 * @param target - The object to wrap
 * @param cache - Optional custom cache implementation
 * @param persistToFileSystem - If true and no custom cache is provided, uses FileSystemCache (default);
 *                             if false, uses InMemoryCache
 * @returns A proxy wrapped version of the target with method caching
 */
export function fastForward<T extends object>(target: T, cache: Cache = new InMemoryCache()): T {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver);

      // Don't cache non-method properties, but
      // recursively wrap them in a proxy
      if (!isMethod(obj, prop)) {
        if (isObject(value)) {
          return fastForward(value as any, cache);
        }
        return value;
      }

      const method = value as Function;

      // Create a function that will handle caching
      return function (this: any, ...args: any[]) {
        // Create a unique key for the method, taking into account the 'this' context
        // This ensures proper handling of methods that depend on 'this'
        const cacheKey = generateCacheKey(`${String(prop)}`, args);

        // Check if we have a cached result
        if (cache.has(cacheKey)) {
          const cachedResult = cache.get(cacheKey);

          if (!isObject(cachedResult)) {
            return cachedResult;
          }

          if (cachedResult.__ff_promise_result === true) {
            // This was a resolved promise value that we cached
            // Return a new pre-resolved promise with the same value
            return new Promise((resolve) => setTimeout(() => resolve(cachedResult.value), 1));
          }

          return cachedResult;
        }

        // Call the original method
        const result = method.apply(obj, args);

        // Handle Promise results
        if (result instanceof Promise) {
          return result.then((resolvedValue: any) => {
            // Store the resolved value with a marker
            cache.set(cacheKey, {
              __ff_promise_result: true,
              value: resolvedValue,
            });
            return resolvedValue;
          });
        } else {
          // For non-promises, cache as normal
          cache.set(cacheKey, result);
          return result;
        }
      };
    },
  });
}
