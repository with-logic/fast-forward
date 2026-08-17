import { createHash } from 'crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { Cache } from './types';

/**
 * Cache entry structure for storing in files
 */
interface CacheEntry {
  key: string;
  value: any;
  timestamp: number;
  args?: any[];
}

/**
 * A file system-based cache implementation that stores each entry as a JSON file.
 * Files are named based on a hash of the cache key.
 */
export class FileSystemCache implements Cache {
  private cacheDir: string;
  private namespace: string;

  /**
   * Creates a new FileSystemCache instance.
   *
   * @param options - Configuration options
   * @param options.cacheDir - Directory to store cache files (defaults to '.fastforward-cache' in the current directory)
   * @param options.namespace - Subdirectory within cacheDir to use for this cache instance (defaults to 'default')
   */
  constructor(options?: { cacheDir?: string; namespace?: string }) {
    this.cacheDir = options?.cacheDir || join(process.cwd(), '.fastforward-cache');
    this.namespace = options?.namespace || 'default';

    // Create cache directory including namespace subdirectory if they don't exist
    const namespacedDir = join(this.cacheDir, this.namespace);
    mkdirSync(namespacedDir, { recursive: true });
  }

  /**
   * Gets the path for a cache key.
   *
   * @param key - The cache key
   * @returns The file path for the key
   */
  private getFilePath(key: string): string {
    // Create a hash of the key to use as the filename
    const hash = createHash('sha256').update(key).digest('hex');
    return join(this.cacheDir, this.namespace, `${hash}.json`);
  }

  /**
   * Gets a value from the cache.
   *
   * @param key - The cache key
   * @returns The cached value or undefined if not found
   */
  get(key: string): any | undefined {
    const filePath = this.getFilePath(key);

    if (!existsSync(filePath)) {
      return undefined;
    }

    try {
      const data = readFileSync(filePath, 'utf8');
      const entry: CacheEntry = JSON.parse(data);
      return entry.value;
    } catch (error) {
      // If there's an error reading or parsing the file, return undefined
      return undefined;
    }
  }

  /**
   * Sets a value in the cache.
   *
   * @param key - The cache key
   * @param value - The value to cache
   * @param args - Optional arguments that were used to generate this key (for inspection)
   */
  set(key: string, value: any, args?: any[]): void {
    const filePath = this.getFilePath(key);

    const entry: CacheEntry = {
      key,
      value,
      timestamp: Date.now(),
      args,
    };

    const data = JSON.stringify(entry, null, 2);
    writeFileSync(filePath, data, 'utf8');
  }

  /**
   * Checks if a key exists in the cache.
   *
   * @param key - The cache key
   * @returns True if the key exists, false otherwise
   */
  has(key: string): boolean {
    const filePath = this.getFilePath(key);
    return existsSync(filePath);
  }

  /**
   * Deletes a key from the cache.
   *
   * @param key - The cache key to delete
   * @returns True if the entry was deleted, false if it didn't exist
   */
  delete(key: string): boolean {
    const filePath = this.getFilePath(key);

    if (existsSync(filePath)) {
      unlinkSync(filePath);
      return true;
    }

    return false;
  }

  /**
   * Clears all entries from the cache within the current namespace.
   * For efficiency, removes and recreates the entire namespace directory.
   */
  clear(): void {
    try {
      const namespacedDir = join(this.cacheDir, this.namespace);

      // If the directory exists, remove it recursively
      if (existsSync(namespacedDir)) {
        // First, remove all regular files in the directory
        // This is a backup approach for platforms with issues deleting non-empty dirs
        const files = readdirSync(namespacedDir);
        for (const file of files) {
          const filePath = join(namespacedDir, file);
          const stats = statSync(filePath);
          if (stats.isFile()) {
            unlinkSync(filePath);
          }
        }

        // Now try to remove the directory
        try {
          rmdirSync(namespacedDir);
        } catch (error) {
          // If directory is not empty or we don't have permission,
          // the code above should have at least removed all cache files
        }
      }

      // Recreate the empty directory
      mkdirSync(namespacedDir, { recursive: true });
    } catch (error) {
      // Silently fail since the end result should be the same - an empty cache
      // Ensure the directory exists for future operations
      try {
        const namespacedDir = join(this.cacheDir, this.namespace);
        mkdirSync(namespacedDir, { recursive: true });
      } catch (_) {
        // If we can't create the directory, future operations will fail naturally
      }
    }
  }
}
