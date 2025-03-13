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
