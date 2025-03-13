/**
 * Cache operation modes.
 */
export enum CacheMode {
  /**
   * Normal caching behavior (default) - read from cache if available, otherwise compute and store.
   */
  ON = 'ON',

  /**
   * Disable caching completely - always compute fresh results and don't store them.
   */
  OFF = 'OFF',

  /**
   * Force update mode - always compute fresh results but store them for future use.
   */
  UPDATE_ONLY = 'UPDATE_ONLY',

  /**
   * Read-only mode - only read from cache, don't compute if not found.
   */
  READ_ONLY = 'READ_ONLY',
}

/**
 * Options for fastForward function.
 */
export interface FastForwardOptions {
  /**
   * The cache implementation to use
   */
  cache?: Cache;

  /**
   * The cache mode to use
   */
  mode?: CacheMode;
}

/**
 * Interface for cache implementations.
 */
export interface Cache {
  /**
   * Gets a value from the cache by key.
   *
   * @param key - The cache key
   * @returns The cached value or undefined if not found
   */
  get(key: string | undefined): any | undefined;

  /**
   * Sets a value in the cache.
   *
   * @param key - The cache key
   * @param value - The value to cache
   */
  set(key: string | undefined, value: any): void;

  /**
   * Checks if a key exists in the cache.
   *
   * @param key - The cache key
   * @returns True if the key exists, false otherwise
   */
  has(key: string | undefined): boolean;

  /**
   * Deletes a key from the cache.
   * Required for proper promise error handling.
   *
   * @param key - The cache key to delete
   * @returns True if the entry was deleted, false if it didn't exist
   */
  delete(key: string | undefined): boolean;

  /**
   * Clears all entries from the cache.
   * Required for cache controller functionality.
   */
  clear(): void;
}
