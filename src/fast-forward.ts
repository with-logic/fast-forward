import { Cache, CacheMode, FastForwardOptions } from './types';
import { InMemoryCache } from './in-memory-cache';
import {
  generateCacheKey,
  isMethod,
  isObject,
  isCache,
  isFastForwardOptions,
  parseCacheMode,
} from './utils';

/**
 * Gets the cache mode from environment variables if one is set.
 *
 * @returns The cache mode from environment or undefined if not set
 */
function getCacheModeFromEnv(): CacheMode | undefined {
  const envMode = process.env.FASTFORWARD_MODE;
  return parseCacheMode(envMode);
}

/**
 * Wraps an object in a Proxy that caches method call results.
 *
 * @template T - The type of the object being wrapped
 * @param target - The object to wrap
 * @param options - Either a Cache implementation or FastForwardOptions
 * @returns A proxy wrapped version of the target with method caching
 *
 * @remarks
 * The caching behavior can be controlled in two ways:
 * 1. By setting the FASTFORWARD_MODE environment variable
 * 2. By passing options.mode in the function call
 *
 * Priority is given to explicitly passed options, which override the environment variable.
 */
export function fastForward<T extends object>(
  target: T,
  options: Cache | FastForwardOptions = new InMemoryCache()
): T {
  // Default values
  let cache: Cache = new InMemoryCache();
  let mode: CacheMode = CacheMode.ON;

  // Get environment variable mode first (lowest priority)
  const envMode = getCacheModeFromEnv();
  if (envMode !== undefined) {
    mode = envMode;
  }

  // Parse options (highest priority, overrides environment variables)
  if (isCache(options)) {
    // If options is a Cache implementation
    cache = options;
  } else if (isFastForwardOptions(options)) {
    // If options is FastForwardOptions
    if (options.cache) {
      cache = options.cache;
    }
    if (options.mode) {
      // Explicit mode in options overrides environment variable
      mode = options.mode;
    }
  }

  return new Proxy(target, {
    get(obj, prop, receiver) {
      const value = Reflect.get(obj, prop, receiver);

      // Don't cache non-method properties, but
      // recursively wrap them in a proxy
      if (!isMethod(obj, prop)) {
        if (isObject(value)) {
          return fastForward(value as any, { cache, mode });
        }
        return value;
      }

      const method = value as Function;

      // Create a function that will handle caching
      return function (this: any, ...args: any[]) {
        // Create a unique key for the method, taking into account the 'this' context
        // This ensures proper handling of methods that depend on 'this'
        const cacheKey = generateCacheKey(`${String(prop)}`, args);

        // If caching is completely disabled
        if (mode === CacheMode.OFF) {
          return method.apply(obj, args);
        }

        // Check if we have a cached result and should use it (ON or READ_ONLY modes)
        if ((mode === CacheMode.ON || mode === CacheMode.READ_ONLY) && cache.has(cacheKey)) {
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

        // If in READ_ONLY mode and there's no cache, return undefined
        if (mode === CacheMode.READ_ONLY && !cache.has(cacheKey)) {
          return undefined;
        }

        // Call the original method (happens in ON, UPDATE_ONLY modes, or when cache miss in default mode)
        const result = method.apply(obj, args);

        // Only cache results in ON or UPDATE_ONLY modes
        if (mode === CacheMode.ON || mode === CacheMode.UPDATE_ONLY) {
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
          }
        }

        return result;
      };
    },
  });
}
