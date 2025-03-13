import { fastForward as ff, FileSystemCache, InMemoryCache } from '../src';
import * as path from 'path';

// Create an object with expensive methods
const calculator = {
  add: (a: number, b: number): number => {
    console.log('Calculating add...');
    return a + b;
  },
  
  fibonacci: (n: number): number => {
    console.log(`Calculating fibonacci(${n})...`);
    if (n <= 1) return n;
    return calculator.fibonacci(n - 1) + calculator.fibonacci(n - 2);
  },
  
  randomValue: (): number => {
    console.log('Generating random value...');
    return Math.random();
  }
};

// Demonstrate different cache options

// Option 1: Persistent file system cache (default)
const defaultCalculator = ff(calculator);

// Option 2: In-memory cache (non-persistent)
const memoryCache = new InMemoryCache();
const memoryCalculator = ff(calculator, memoryCache);

// Option 3: Persistent file system cache with custom directory
const fileSystemCache = new FileSystemCache({
  cacheDir: path.join(process.cwd(), '.my-custom-cache')
});
const diskCalculator = ff(calculator, fileSystemCache);

// Option 3b: File system cache with namespace
const namespacedCache = new FileSystemCache({
  namespace: 'my-calculator-app'
});
const namespacedCalculator = ff(calculator, namespacedCache);

// Option 4: Explicitly disable persistence by using in-memory cache
const nonPersistentCalculator = ff(calculator, new InMemoryCache());

// Demo basic usage with default cache (filesystem)
console.log('--- Default cache (filesystem) demo ---');
console.log(defaultCalculator.add(1, 2)); // First call - executes & writes to disk
console.log(defaultCalculator.add(1, 2)); // Second call - reads from disk
console.log('Cache files stored in: .fastforward-cache/');

// Demo in-memory cache
console.log('\n--- In-memory cache demo ---');
console.log(memoryCalculator.add(2, 3)); // First call - executes
console.log(memoryCalculator.add(2, 3)); // Second call - cached
console.log(memoryCalculator.add(4, 5)); // Different args - executes

// Demo filesystem cache with custom directory
console.log('\n--- Custom directory cache demo ---');
console.log(diskCalculator.add(10, 20)); // First call - executes and saves to file
console.log(diskCalculator.add(10, 20)); // Second call - reads from file
console.log(`Cache files stored in: ${fileSystemCache['cacheDir']}`);

// Demo explicitly non-persisted cache
console.log('\n--- Non-persistent cache demo ---');
console.log(nonPersistentCalculator.add(30, 40)); // First call - executes
console.log(nonPersistentCalculator.add(30, 40)); // Second call - cached from memory

// Demo recursive function optimization
console.log('\n--- Recursive function optimization ---');
console.log(`fibonacci(5) = ${diskCalculator.fibonacci(5)}`);

// Demo random value caching 
console.log('\n--- Random value caching ---');
console.log(`Random value: ${diskCalculator.randomValue()}`);
console.log(`Same random value from cache: ${diskCalculator.randomValue()}`);
console.log('This shows how even non-deterministic functions return cached values');

// Demo namespaced cache
console.log('\n--- Namespaced cache demo ---');
console.log(namespacedCalculator.add(5, 5)); // First call - executes & caches in namespace
console.log(namespacedCalculator.add(5, 5)); // Second call - reads from namespaced cache
console.log('Cache files stored in: .fastforward-cache/my-calculator-app/');

// Create a second instance with a different namespace 
const otherNamespace = new FileSystemCache({ namespace: 'other-app' });
const otherCalculator = ff(calculator, otherNamespace);
console.log('\nSeparate namespaces keep caches isolated:');
console.log(otherCalculator.add(5, 5)); // Executes because this namespace doesn't have this key
console.log(otherCalculator.add(5, 5)); // Now it's cached in the other namespace

// Note: Cache invalidation is not directly supported in this version.
// To invalidate the cache, you would need to create a new cache instance or 
// manually clear the underlying cache.

// Example of clearing a cache (completely)
console.log('\n--- Manual cache clearing ---');
console.log('Before clearing cache:');
console.log(namespacedCalculator.add(5, 5)); // Should use cached result

// Clear the cache
namespacedCache.clear();

console.log('\nAfter clearing cache:');
console.log(namespacedCalculator.add(5, 5)); // Will execute again since cache was cleared