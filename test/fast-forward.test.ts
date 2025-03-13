import { fastForward as ff, InMemoryCache } from '../src';
import type { Cache } from '../src';

describe('fastForward', () => {
  // Test Promise support
  describe('Promise support', () => {
    it('should return promises for async methods', async () => {
      // Create a test object with an async method
      const testObj = {
        asyncMethod: (x: number) => Promise.resolve(x * 2),
      };

      const cache = new InMemoryCache();
      const cachedObj = ff(testObj, cache);

      // First call should execute the method
      const result1 = cachedObj.asyncMethod(5);
      expect(result1).toBeInstanceOf(Promise);
      expect(await result1).toBe(10);

      // Second call should use cache but still return a promise
      const result2 = cachedObj.asyncMethod(5);
      expect(result2).toBeInstanceOf(Promise);
      expect(await result2).toBe(10);
    });

    it('should handle promises correctly', async () => {
      // Create a promise-returning method
      const testObj = {
        promiseMethod: () => Promise.resolve(42),
      };

      const cache = new InMemoryCache();
      const cachedObj = ff(testObj, cache);

      // First call should execute the method
      const promise1 = cachedObj.promiseMethod();
      expect(promise1).toBeInstanceOf(Promise);

      // Second call should cache but still return a promise
      const promise2 = cachedObj.promiseMethod();
      expect(promise2).toBeInstanceOf(Promise);

      // Both promises should resolve to the same value
      expect(await promise1).toBe(42);
      expect(await promise2).toBe(42);

      // Third call after promises are resolved should still return a promise
      const promise3 = cachedObj.promiseMethod();
      expect(promise3).toBeInstanceOf(Promise);
      expect(await promise3).toBe(42); // With the same resolved value
    });

    it('should not cache rejected promises', async () => {
      let rejects = 0;

      // Create a test object with an async method that fails
      const error = new Error('Test error');
      const testObj = {
        failingMethod: () => {
          rejects = rejects + 1;
          return Promise.reject(error);
        },
      };

      const cache = new InMemoryCache();
      const cachedObj = ff(testObj, cache);

      // First call should reject
      await expect(cachedObj.failingMethod()).rejects.toThrow('Test error');
      expect(rejects).toBe(1);

      // Second call should execute the method again (not cached)
      await expect(cachedObj.failingMethod()).rejects.toThrow('Test error');
      expect(rejects).toBe(2);
    });

    it('should delete cache entry on promise rejection', async () => {
      let rejects = 0;

      // Create a test object with an async method that fails
      const error = new Error('Delete cache test');
      const testObj = {
        failingMethod: () => {
          rejects = rejects + 1;
          return Promise.reject(error);
        },
      };

      const cache = new InMemoryCache();
      const cachedObj = ff(testObj, cache);

      // Call should fail and trigger cache deletion
      await expect(cachedObj.failingMethod()).rejects.toThrow('Delete cache test');

      // Verify the cache.delete method was called
      expect(rejects).toBe(1);
      expect(cache.has('failingMethod')).toBe(false);
    });

    it('should cache promise results correctly across multiple calls', async () => {
      // Create a counter to verify caching behavior
      let counter = 0;

      const testObj = {
        // This will return an incrementing counter
        getCount: async () => {
          counter++;
          return counter;
        },
      };

      const cache = new InMemoryCache();
      const cachedObj = ff(testObj, cache);

      // First call should execute and return 1
      expect(await cachedObj.getCount()).toBe(1);

      // Counter is now 1
      expect(counter).toBe(1);

      // Second call should use cache and still return 1
      expect(await cachedObj.getCount()).toBe(1);

      // Counter should still be 1 (function not called again)
      expect(counter).toBe(1);
    });
  });

  // Test basic caching functionality
  it('should cache method calls', () => {
    let calls = 0;

    // Create a test object with a real method
    const testObj = {
      add: (a: number, b: number) => {
        calls++;
        return a + b;
      },
    };

    const cache = new InMemoryCache();
    const cachedObj = ff(testObj, cache);

    // First call should execute the method
    expect(cachedObj.add(2, 3)).toBe(5);
    expect(calls).toBe(1);

    // Second call with same args should use cache
    expect(cachedObj.add(2, 3)).toBe(5);
    expect(calls).toBe(1);

    // Call with different args should execute the method again
    expect(cachedObj.add(3, 4)).toBe(7);
    expect(calls).toBe(2);
  });

  it('should cache methods that take a null argument', () => {
    let calls = 0;

    // Create a test object with a real method
    const testObj = {
      add: (_a: any, b: number) => {
        calls++;
        return b;
      },
    };

    const cache = new InMemoryCache();
    const cachedObj = ff(testObj, cache);

    // First call should execute the method
    expect(cachedObj.add({ foo: null }, 3)).toBe(3);
    expect(calls).toBe(1);

    // Second call with same args should use cache
    expect(cachedObj.add({ foo: null }, 3)).toBe(3);
    expect(calls).toBe(1);

    // Call with different args should execute the method again
    expect(cachedObj.add(3, 4)).toBe(4);
    expect(calls).toBe(2);
  });

  it('should cache date arguments', () => {
    let calls = 0;

    // Create a test object with a real method
    const testObj = {
      add: (_a: Date, b: number) => {
        calls++;
        return b;
      },
    };

    const cache = new InMemoryCache();
    const cachedObj = ff(testObj, cache);

    // First call should execute the method
    expect(cachedObj.add(new Date('2023-01-01'), 3)).toBe(3);
    expect(calls).toBe(1);

    // Second call with same args should use cache
    expect(cachedObj.add(new Date('2023-01-01'), 3)).toBe(3);
    expect(calls).toBe(1);

    // Call with different args should execute the method again
    expect(cachedObj.add(new Date('2024-01-01'), 4)).toBe(4);
    expect(calls).toBe(2);
  });

  // Test with properties that aren't methods
  it('should not cache properties that are not methods', () => {
    let cachedValue = 42;

    const testObj = {
      value: 42,
      getValue: () => {
        return cachedValue++;
      },
    };

    const cache = new InMemoryCache();
    const cachedObj = ff(testObj, cache);

    // Accessing a property should work normally
    expect(cachedObj.value).toBe(42);

    // Can modify the property
    testObj.value = 100;
    expect(cachedObj.value).toBe(100);

    // Methods still get cached
    expect(cachedObj.getValue()).toBe(42);
    expect(cachedObj.getValue()).toBe(42);
    expect(testObj.getValue()).toBe(43);
  });
  //
  it('should cache properties that are objects', () => {
    let cachedValue = 42;

    const testObj = {
      nested: {
        value: () => cachedValue++,
      },
    };

    const cache = new InMemoryCache();
    const cachedObj = ff(testObj, cache);

    // Accessing a property should work normally
    expect(cachedObj.nested.value()).toBe(42);

    // Accessing the property again should use cache
    expect(cachedObj.nested.value()).toBe(42);
    expect(cachedValue).toBe(43);
  });

  // Test for caching benefits
  it('should provide caching benefits for repetitive calls', () => {
    let calls = 0;
    const testObj = {
      performCalculation: function (_input: string): number {
        calls++;
        return Math.random();
      },
    };

    const cache = new InMemoryCache();
    const cachedObj = ff(testObj, cache);

    // First call for input "a" - will execute function
    const firstA = cachedObj.performCalculation('a');
    expect(calls).toBe(1);

    // Second call for input "a" - should use cache
    const secondA = cachedObj.performCalculation('a');
    expect(calls).toBe(1); // No additional call

    // Values should be the same since it's cached
    expect(secondA).toBe(firstA);

    // Call for input "b" - will execute function again
    cachedObj.performCalculation('b');
    expect(calls).toBe(2);

    // Another call for input "a" - should still use original cache
    const thirdA = cachedObj.performCalculation('a');
    expect(calls).toBe(2); // No additional call
    expect(thirdA).toBe(firstA);
  });

  // Test with symbol properties
  it('should handle symbol properties correctly', () => {
    const testSymbol = Symbol('test');
    const testObj = {
      [testSymbol]: function () {
        return 'symbol';
      },
    };

    const cache = new InMemoryCache();
    const cachedObj = ff(testObj, cache);

    expect(cachedObj[testSymbol]()).toBe('symbol');
    expect(cachedObj[testSymbol]()).toBe('symbol'); // Still cached
  });

  // Test with non-serializable arguments
  it('should handle non-serializable arguments', () => {
    const circular: any = { ref: null };
    circular.ref = circular; // Create circular reference

    const testObj = {
      method: (_x: any) => 5,
    };

    const cache = new InMemoryCache();
    const cachedObj = ff(testObj, cache);

    // This should not throw even though the args can't be JSON.stringified
    expect(cachedObj.method(circular)).toBe(5);
    expect(cachedObj.method(circular)).toBe(5);
  });

  // Test with non-serializable return values
  it('should handle non-serializable return values', () => {
    const circular: any = { ref: null };
    circular.ref = circular; // Create circular reference

    const testObj = {
      method: () => circular,
    };

    const cache = new InMemoryCache();
    const cachedObj = ff(testObj, cache);

    // This should not throw even though the return value can't be JSON.stringified
    expect(cachedObj.method()).toBe(circular);
    expect(cachedObj.method()).toBe(circular);
  });

  // Test with custom cache implementation
  it('should work with a custom cache implementation', () => {
    // Custom cache that logs operations
    const operations: string[] = [];

    class TestCache implements Cache {
      private store = new Map<string, any>();

      get(key: string): any {
        operations.push(`get:${key}`);
        return this.store.get(key);
      }

      set(key: string, value: any): void {
        operations.push(`set:${key}`);
        this.store.set(key, value);
      }

      has(key: string): boolean {
        operations.push(`has:${key}`);
        return this.store.has(key);
      }

      delete(key: string): boolean {
        operations.push(`delete:${key}`);
        return this.store.delete(key);
      }

      deleteByPrefix(prefix: string): number {
        operations.push(`deleteByPrefix:${prefix}`);
        let count = 0;
        for (const key of this.store.keys()) {
          if (key.startsWith(prefix)) {
            this.store.delete(key);
            count++;
          }
        }
        return count;
      }

      clear(): void {
        operations.push('clear');
        this.store.clear();
      }
    }

    const testObj = {
      method: (x: number) => x * 2,
    };

    const cachedObj = ff(testObj, new TestCache());

    cachedObj.method(5);
    cachedObj.method(5);

    expect(operations).toEqual([
      'has:method:[5]',
      'set:method:[5]',
      'has:method:[5]',
      'get:method:[5]',
    ]);
  });

  it('should provide consistent cache keys regardless of object property order', () => {
    // Create two objects with same properties but different definition order
    const spy = jest.fn().mockImplementation((obj: object) => JSON.stringify(obj));

    const testObj = {
      methodWithObject: spy,
    };

    const cache = new InMemoryCache();
    const cachedObj = ff(testObj, cache);

    // First call with object that has properties in one order
    cachedObj.methodWithObject({ a: 1, b: 2, c: 3 });
    expect(spy).toHaveBeenCalledTimes(1);

    // Second call with same properties but different order
    cachedObj.methodWithObject({ c: 3, b: 2, a: 1 });
    expect(spy).toHaveBeenCalledTimes(1); // Should still be cached

    // Call with nested objects with different property order
    cachedObj.methodWithObject({ x: { a: 1, b: 2 }, y: 3 });
    expect(spy).toHaveBeenCalledTimes(2);

    cachedObj.methodWithObject({ x: { b: 2, a: 1 }, y: 3 });
    expect(spy).toHaveBeenCalledTimes(2); // Should still be cached

    // Different values should not be cached
    cachedObj.methodWithObject({ a: 1, b: 3, c: 3 });
    expect(spy).toHaveBeenCalledTimes(3);
  });
});
