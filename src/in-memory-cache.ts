import { Cache } from './types';

/**
 * In-memory cache implementation using a simple Map.
 * Does not persist between application restarts.
 */
export class InMemoryCache implements Cache {
  private cache = new Map<string, any>();

  /**
   * Gets a value from the cache by key.
   *
   * @param key - The cache key
   * @returns The cached value or undefined if not found
   */
  public get(key: string): any | undefined {
    return this.cache.get(key);
  }

  /**
   * Sets a value in the cache.
   *
   * @param key - The cache key
   * @param value - The value to cache
   */
  public set(key: string, value: any): void {
    this.cache.set(key, value);
  }

  /**
   * Checks if a key exists in the cache.
   *
   * @param key - The cache key
   * @returns True if the key exists, false otherwise
   */
  public has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Deletes an entry from the cache.
   *
   * @param key - The cache key to delete
   * @returns True if the entry was deleted, false if it didn't exist
   */
  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clears all entries from the cache.
   */
  public clear(): void {
    this.cache.clear();
  }
}
