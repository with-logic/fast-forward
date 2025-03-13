import * as fs from 'fs';
import * as path from 'path';
import { FileSystemCache } from '../src';

describe('FileSystemCache', () => {
  let cache: FileSystemCache;
  const testCacheDir = path.join(process.cwd(), '.test-cache');

  beforeEach(() => {
    // Create a fresh cache for each test with a test-specific directory
    cache = new FileSystemCache({ cacheDir: testCacheDir });
  });

  afterEach(() => {
    // Clean up the test cache directory after each test
    if (fs.existsSync(testCacheDir)) {
      const cleanDir = (dir: string) => {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
              cleanDir(filePath);
              fs.rmdirSync(filePath);
            } else {
              fs.unlinkSync(filePath);
            }
          }
        }
      };

      cleanDir(testCacheDir);
      fs.rmdirSync(testCacheDir);
    }
  });

  it('should store and retrieve values', () => {
    const key = 'test-key';
    const value = { foo: 'bar', num: 42 };

    cache.set(key, value);

    const retrieved = cache.get(key);
    expect(retrieved).toEqual(value);
  });

  it('should check if a key exists', () => {
    const key = 'test-key';

    expect(cache.has(key)).toBe(false);

    cache.set(key, 'value');

    expect(cache.has(key)).toBe(true);
  });

  it('should delete entries', () => {
    const key = 'test-key';
    cache.set(key, 'value');

    expect(cache.has(key)).toBe(true);

    const result = cache.delete(key);

    expect(result).toBe(true);
    expect(cache.has(key)).toBe(false);
  });

  it('should return false when deleting non-existent entries', () => {
    // Test deletion of non-existent key
    const result = cache.delete('nonexistent');
    expect(result).toBe(false);

    // Also explicitly test the file not existing path (code path via existsSync)
    const key = 'key-for-not-exists-test';
    // Create a cache entry
    cache.set(key, 'value');
    // Get the file path
    const namespacedDir = path.join(testCacheDir, 'default');
    const files = fs.readdirSync(namespacedDir);
    const keyFile = files.find((f) => f.endsWith('.json'));
    const filePath = path.join(namespacedDir, keyFile!);
    // Delete the file directly to simulate it being gone
    fs.unlinkSync(filePath);
    // Now try to delete the key - should return false since file is gone
    const result2 = cache.delete(key);
    expect(result2).toBe(false);
  });

  it('should clear all entries', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    cache.clear();

    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key2')).toBe(false);
  });

  it('should handle edge cases', () => {
    // Check that the cache handles undefined values properly
    cache.set('undefined-key', undefined);
    expect(cache.has('undefined-key')).toBe(true);
    expect(cache.get('undefined-key')).toBeUndefined();

    // Check that the cache handles null values properly
    cache.set('null-key', null);
    expect(cache.has('null-key')).toBe(true);
    expect(cache.get('null-key')).toBeNull();

    // Check that the cache handles empty strings properly
    cache.set('', 'empty-key-value');
    expect(cache.has('')).toBe(true);
    expect(cache.get('')).toBe('empty-key-value');

    // Check that the cache handles complex objects properly
    // Note: Dates are serialized to strings in JSON, so we need to explicitly handle them
    const date = new Date();
    const complexObj = { a: [1, 2, { b: 3 }], c: date };
    cache.set('complex', complexObj);

    const retrieved = cache.get('complex');
    // For comprehensive test, check parts of the object structure instead of direct equality
    expect(retrieved.a).toEqual([1, 2, { b: 3 }]);
    // The date will be a string (ISO format) when retrieved, not a Date object
    expect(typeof retrieved.c).toBe('string');

    // Test getting a non-existent key explicitly
    expect(cache.get('non-existent-key')).toBeUndefined();
  });

  it('should store metadata along with values', () => {
    const key = 'test-key';
    const value = 'test-value';
    const args = [1, 'string', { obj: true }];

    cache.set(key, value, args);

    // The value should be retrievable
    expect(cache.get(key)).toBe(value);

    // Check the file was created with the correct structure
    const defaultNamespaceDir = path.join(testCacheDir, 'default');
    const filePath = path.join(defaultNamespaceDir, fs.readdirSync(defaultNamespaceDir)[0]);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(fileContent);

    expect(parsed.key).toBe(key);
    expect(parsed.value).toBe(value);
    expect(parsed.args).toEqual(args);
    expect(typeof parsed.timestamp).toBe('number');
  });

  it('should use the default cache directory when not specified', () => {
    const defaultCache = new FileSystemCache();
    const defaultDir = path.join(process.cwd(), '.fastforward-cache');
    const defaultNamespaceDir = path.join(defaultDir, 'default');

    // Set a value to ensure the directory is created
    defaultCache.set('default-test', 'value');

    // Verify the directory exists
    expect(fs.existsSync(defaultDir)).toBe(true);
    expect(fs.existsSync(defaultNamespaceDir)).toBe(true);

    // Clean up
    if (fs.existsSync(defaultDir)) {
      try {
        const cleanDir = (dir: string) => {
          if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            for (const file of files) {
              const filePath = path.join(dir, file);
              const stats = fs.statSync(filePath);
              if (stats.isDirectory()) {
                cleanDir(filePath);
                fs.rmdirSync(filePath);
              } else if (file.endsWith('.json')) {
                fs.unlinkSync(filePath);
              }
            }
          }
        };

        cleanDir(defaultDir);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
  });

  it('should handle read errors gracefully', () => {
    // Set up a key that we'll corrupt
    const key = 'corrupt-key';
    cache.set(key, 'good-value');

    // Find the file path for this key
    const namespacedDir = path.join(testCacheDir, 'default');
    const cacheFiles = fs.readdirSync(namespacedDir);
    const filePath = path.join(namespacedDir, cacheFiles[0]);

    // Corrupt the file with invalid JSON
    fs.writeFileSync(filePath, 'not valid json', 'utf8');

    // Should return undefined for corrupted entry
    expect(cache.get(key)).toBeUndefined();
  });

  it('should handle error during deletion', () => {
    // We'll test the final catch block by forcing a delete on a non-existent key
    // First, let's get a key that doesn't exist in the filesystem
    const key = 'delete-error-test';

    // Make sure the cache doesn't have this key
    if (cache.has(key)) {
      cache.delete(key);
    }

    // Now we'll ensure the delete method properly handles errors
    // by checking that it returns false for a non-existent key
    const result = cache.delete(key);
    expect(result).toBe(false);
  });

  it('should handle errors during file deletion', () => {
    // Create a test key and entry
    const key = 'deletion-error-test';
    cache.set(key, 'test-value');

    // Verify key exists
    expect(cache.has(key)).toBe(true);

    // Get the namespaced directory
    const namespacedDir = path.join(testCacheDir, 'default');

    // Make the file read-only so we can't delete it
    const dirMode = fs.statSync(namespacedDir).mode;

    // Make parent directory read-only which should prevent deletion
    fs.chmodSync(namespacedDir, 0o444); // Read-only

    try {
      // This should trigger the catch block in delete method
      const result = cache.delete(key);
      // Should return false due to error
      expect(result).toBe(false);
    } finally {
      // Restore permissions so cleanup works
      fs.chmodSync(namespacedDir, dirMode);
    }
  });

  it('should handle errors during directory deletion in clear', () => {
    // Set some values
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    // Get the namespaced directory
    const namespacedDir = path.join(testCacheDir, 'default');

    // Create a subdirectory that will cause rmdir to fail (since dir is not empty)
    const subDir = path.join(namespacedDir, 'subdir');
    fs.mkdirSync(subDir, { recursive: true });

    // Create a file in the subdirectory to make it non-empty
    const subDirFile = path.join(subDir, 'test.txt');
    fs.writeFileSync(subDirFile, 'test content', 'utf8');

    // Make the subdirectory read-only
    fs.chmodSync(subDir, 0o555); // Read and execute only

    try {
      // This should not throw despite rmdir failing on non-empty directory
      cache.clear();

      // Cached files should still be gone
      expect(cache.has('key1')).toBe(false);

      // Subdirectory should still exist because we couldn't fully delete it
      expect(fs.existsSync(subDir)).toBe(true);

      // Parent namespace directory should also still exist
      expect(fs.existsSync(namespacedDir)).toBe(true);
    } finally {
      // Restore permissions so cleanup can happen
      // Need to make subdirectory writable so we can delete test file
      fs.chmodSync(subDir, 0o755);

      // Delete the file we created
      if (fs.existsSync(subDirFile)) {
        fs.unlinkSync(subDirFile);
      }

      // Delete the subdirectory
      if (fs.existsSync(subDir)) {
        fs.rmdirSync(subDir);
      }
    }
  });

  it('should handle errors when trying to recreate directory', () => {
    // Set some values
    cache.set('key1', 'value1');

    // Get the parent directory path and namespace directory
    const parentDir = testCacheDir;
    const namespacedDir = path.join(testCacheDir, 'default');

    // First make the namespace directory readable so we can delete its contents
    fs.chmodSync(namespacedDir, 0o755);

    // Delete all files in namespace directory
    const files = fs.readdirSync(namespacedDir);
    files.forEach((file) => {
      const filePath = path.join(namespacedDir, file);
      fs.unlinkSync(filePath);
    });

    // Remove the namespace directory
    fs.rmdirSync(namespacedDir);

    // Now make the parent directory read-only to cause mkdir to fail in clear()
    const parentDirMode = fs.statSync(parentDir).mode;
    fs.chmodSync(parentDir, 0o444); // Read-only permissions

    try {
      // Clear should not throw even when directory recreation fails due to permissions
      cache.clear();

      // Directory won't be recreated because parent has no write permissions
      expect(fs.existsSync(namespacedDir)).toBe(false);
    } finally {
      // Restore permissions
      fs.chmodSync(parentDir, parentDirMode);

      // Make sure the namespace directory exists for other tests
      if (!fs.existsSync(namespacedDir)) {
        fs.mkdirSync(namespacedDir, { recursive: true });
      }
    }
  });

  it('should clear the entire namespace directory', () => {
    // Set some values
    cache.set('key1', 'value1');

    // Get the namespaced directory
    const namespacedDir = path.join(testCacheDir, 'default');

    // Create a non-JSON file in the namespaced cache directory
    const nonJsonPath = path.join(namespacedDir, 'other-file.txt');
    fs.writeFileSync(nonJsonPath, 'This is another file', 'utf8');

    // Clear the cache
    cache.clear();

    // JSON files should be gone
    expect(cache.has('key1')).toBe(false);

    // The non-JSON file should also be gone as we now remove the entire directory
    expect(fs.existsSync(nonJsonPath)).toBe(false);

    // Directory should be recreated
    expect(fs.existsSync(namespacedDir)).toBe(true);

    // Directory should be empty (except for any new files created automatically)
    const filesAfterClear = fs.readdirSync(namespacedDir);
    expect(filesAfterClear.length).toBe(0);
  });

  it('should handle missing directory during clear', () => {
    // Set some values
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    // Get the namespaced directory
    const namespacedDir = path.join(testCacheDir, 'default');

    // Remove the entire directory to simulate it not existing
    try {
      // First delete files to ensure directory can be removed
      const files = fs.readdirSync(namespacedDir);
      files.forEach((file) => {
        fs.unlinkSync(path.join(namespacedDir, file));
      });
      fs.rmdirSync(namespacedDir);
    } catch (error) {
      // Ignore errors during setup
    }

    // Make sure the directory doesn't exist
    expect(fs.existsSync(namespacedDir)).toBe(false);

    // This should not throw and should recreate the directory
    cache.clear();

    // Verify the directory has been recreated
    expect(fs.existsSync(namespacedDir)).toBe(true);
  });

  describe('Namespace functionality', () => {
    it('should use default namespace when not specified', () => {
      const cache = new FileSystemCache({ cacheDir: testCacheDir });
      cache.set('testKey', 'testValue');

      // Check that the file was created in the default namespace
      const defaultNamespaceDir = path.join(testCacheDir, 'default');
      expect(fs.existsSync(defaultNamespaceDir)).toBe(true);
      expect(fs.readdirSync(defaultNamespaceDir).length).toBeGreaterThan(0);
    });

    it('should use custom namespace when specified', () => {
      const customNamespace = 'custom-namespace';
      const cache = new FileSystemCache({ cacheDir: testCacheDir, namespace: customNamespace });
      cache.set('testKey', 'testValue');

      // Check that the file was created in the custom namespace
      const customNamespaceDir = path.join(testCacheDir, customNamespace);
      expect(fs.existsSync(customNamespaceDir)).toBe(true);
      expect(fs.readdirSync(customNamespaceDir).length).toBeGreaterThan(0);
    });

    it('should keep data separate between different namespaces', () => {
      // Create two caches with different namespaces
      const namespace1 = 'namespace1';
      const namespace2 = 'namespace2';
      const cache1 = new FileSystemCache({ cacheDir: testCacheDir, namespace: namespace1 });
      const cache2 = new FileSystemCache({ cacheDir: testCacheDir, namespace: namespace2 });

      // Set the same key in both caches with different values
      const key = 'shared-key';
      const value1 = 'value-for-namespace1';
      const value2 = 'value-for-namespace2';

      cache1.set(key, value1);
      cache2.set(key, value2);

      // Verify each cache has its own copy with the correct value
      expect(cache1.get(key)).toBe(value1);
      expect(cache2.get(key)).toBe(value2);

      // Check that both namespace directories exist
      const dir1 = path.join(testCacheDir, namespace1);
      const dir2 = path.join(testCacheDir, namespace2);
      expect(fs.existsSync(dir1)).toBe(true);
      expect(fs.existsSync(dir2)).toBe(true);
    });

    it('should only clear cache entries in its own namespace', () => {
      // Create two caches with different namespaces
      const namespace1 = 'namespace1';
      const namespace2 = 'namespace2';
      const cache1 = new FileSystemCache({ cacheDir: testCacheDir, namespace: namespace1 });
      const cache2 = new FileSystemCache({ cacheDir: testCacheDir, namespace: namespace2 });

      // Set keys in both caches
      cache1.set('key1', 'value1');
      cache2.set('key2', 'value2');

      // Clear only the first cache
      cache1.clear();

      // Verify first cache is empty while second still has its data
      expect(cache1.has('key1')).toBe(false);
      expect(cache2.has('key2')).toBe(true);
    });
  });
});
