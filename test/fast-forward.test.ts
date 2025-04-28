import { fastForward as ff, InMemoryCache, CacheMode } from '../src';
import type { Cache, FastForwardOptions, KeyComponents } from '../src';

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

  // Test different cache modes
  describe('cache modes', () => {
    // Test OFF mode
    it('should disable caching when mode is OFF', () => {
      let calls = 0;
      const testObj = {
        method: (x: number) => {
          calls++;
          return x * 2;
        },
      };

      const cache = new InMemoryCache();
      const options: FastForwardOptions = { cache, mode: CacheMode.OFF };
      const cachedObj = ff(testObj, options);

      // First call - normal execution
      expect(cachedObj.method(5)).toBe(10);
      expect(calls).toBe(1);

      // Second call - should execute again because caching is OFF
      expect(cachedObj.method(5)).toBe(10);
      expect(calls).toBe(2);
    });

    // Test UPDATE_ONLY mode
    it('should always update cache when mode is UPDATE_ONLY', () => {
      let counter = 0;
      const testObj = {
        getCounter: () => {
          return counter++;
        },
      };

      const cache = new InMemoryCache();
      const options: FastForwardOptions = { cache, mode: CacheMode.UPDATE_ONLY };
      const cachedObj = ff(testObj, options);

      // First call - returns 0, counter becomes 1
      expect(cachedObj.getCounter()).toBe(0);
      expect(counter).toBe(1);

      // Second call - should execute again and return 1 (not cached), counter becomes 2
      expect(cachedObj.getCounter()).toBe(1);
      expect(counter).toBe(2);

      // Switch to normal mode to verify values were cached
      const normalObj = ff(testObj, { cache, mode: CacheMode.ON });

      // This should return the latest cached value (1)
      expect(normalObj.getCounter()).toBe(1);
      // Counter should not increment as we're using the cache
      expect(counter).toBe(2);
    });

    // Test READ_ONLY mode
    it('should only read from cache when mode is READ_ONLY', () => {
      let calls = 0;
      const testObj = {
        method: (x: number) => {
          calls++;
          return x * 2;
        },
      };

      const cache = new InMemoryCache();

      // First, populate the cache using normal mode
      const normalObj = ff(testObj, cache);
      expect(normalObj.method(5)).toBe(10);
      expect(calls).toBe(1);

      // Now switch to READ_ONLY mode
      const readOnlyObj = ff(testObj, { cache, mode: CacheMode.READ_ONLY });

      // Should read from cache without executing the method
      expect(readOnlyObj.method(5)).toBe(10);
      expect(calls).toBe(1); // No additional calls

      // Should return undefined for uncached values
      expect(readOnlyObj.method(10)).toBeUndefined();
      expect(calls).toBe(1); // Still no additional calls
    });

    // Test options compatibility
    it('should accept a Cache implementation directly for backward compatibility', () => {
      let calls = 0;
      const testObj = {
        method: (x: number) => {
          calls++;
          return x * 2;
        },
      };

      const cache = new InMemoryCache();
      const cachedObj = ff(testObj, cache); // Old style

      // Should still work with normal caching behavior
      expect(cachedObj.method(5)).toBe(10);
      expect(calls).toBe(1);

      expect(cachedObj.method(5)).toBe(10);
      expect(calls).toBe(1); // No additional calls (using cache)
    });

    // Test environment variable override (mocking process.env)
    it('should have explicit options override environment variables', () => {
      // Save original process.env
      const originalEnv = process.env.FASTFORWARD_MODE;

      try {
        // Set environment variable
        process.env.FASTFORWARD_MODE = 'OFF';

        let calls = 0;
        const testObj = {
          method: (x: number) => {
            calls++;
            return x * 2;
          },
        };

        const cache = new InMemoryCache();
        // Explicit ON mode should override env OFF mode
        const cachedObj = ff(testObj, { cache, mode: CacheMode.ON });

        // First call - normal execution
        expect(cachedObj.method(5)).toBe(10);
        expect(calls).toBe(1);

        // Second call - should use cache because explicit options override env
        expect(cachedObj.method(5)).toBe(10);
        expect(calls).toBe(1); // Still 1, using cache despite env=OFF

        // Test environment variable works when no explicit mode is provided
        const envCachedObj = ff(testObj, { cache });

        // First call - normal execution
        expect(envCachedObj.method(5)).toBe(10);
        expect(calls).toBe(2); // Increased to 2

        // Second call - should execute again because env=OFF is used
        expect(envCachedObj.method(5)).toBe(10);
        expect(calls).toBe(3); // Increased to 3, not using cache
      } finally {
        // Restore original environment or unset if it wasn't set
        if (originalEnv === undefined) {
          delete process.env.FASTFORWARD_MODE;
        } else {
          process.env.FASTFORWARD_MODE = originalEnv;
        }
      }
    });

    it('should handle invalid environment variable values', () => {
      // Save original process.env
      const originalEnv = process.env.FASTFORWARD_MODE;

      try {
        // Set invalid environment variable
        process.env.FASTFORWARD_MODE = 'INVALID_MODE';

        let calls = 0;
        const testObj = {
          method: (x: number) => {
            calls++;
            return x * 2;
          },
        };

        const cache = new InMemoryCache();
        // Use normal mode in code, and env should be ignored because invalid
        const cachedObj = ff(testObj, { cache, mode: CacheMode.ON });

        // First call - normal execution
        expect(cachedObj.method(5)).toBe(10);
        expect(calls).toBe(1);

        // Second call - should use cache because env was invalid
        expect(cachedObj.method(5)).toBe(10);
        expect(calls).toBe(1); // Still 1, not increased
      } finally {
        // Restore original environment or unset if it wasn't set
        if (originalEnv === undefined) {
          delete process.env.FASTFORWARD_MODE;
        } else {
          process.env.FASTFORWARD_MODE = originalEnv;
        }
      }
    });

    it('should handle case-insensitive environment variable values', () => {
      // Save original process.env
      const originalEnv = process.env.FASTFORWARD_MODE;

      try {
        // Set lowercase environment variable
        process.env.FASTFORWARD_MODE = 'off';

        let calls = 0;
        const testObj = {
          method: (x: number) => {
            calls++;
            return x * 2;
          },
        };

        const cache = new InMemoryCache();
        // Without explicit mode, should use env 'off' value
        const cachedObj = ff(testObj, { cache });

        // First call - normal execution
        expect(cachedObj.method(5)).toBe(10);
        expect(calls).toBe(1);

        // Second call - should execute again due to OFF mode from env
        expect(cachedObj.method(5)).toBe(10);
        expect(calls).toBe(2); // Increased to 2, not using cache

        // With explicit mode, should override env
        const explicitObj = ff(testObj, { cache, mode: CacheMode.ON });

        // First call
        expect(explicitObj.method(5)).toBe(10);
        expect(calls).toBe(3);

        // Second call - should use cache despite env=off
        expect(explicitObj.method(5)).toBe(10);
        expect(calls).toBe(3); // Still 3, using cache
      } finally {
        // Restore original environment or unset if it wasn't set
        if (originalEnv === undefined) {
          delete process.env.FASTFORWARD_MODE;
        } else {
          process.env.FASTFORWARD_MODE = originalEnv;
        }
      }
    });

    it('should test all environment variable modes and option overrides', () => {
      // Save original process.env
      const originalEnv = process.env.FASTFORWARD_MODE;

      try {
        let calls = 0;
        const testObj = {
          method: (x: number) => {
            calls++;
            return x * 2;
          },
        };

        const cache = new InMemoryCache();

        // First fill the cache with a normal instance
        process.env.FASTFORWARD_MODE = ''; // Clear env var
        const normalObj = ff(testObj, { cache });
        expect(normalObj.method(5)).toBe(10);
        expect(calls).toBe(1);

        // Test READ_ONLY mode via environment
        process.env.FASTFORWARD_MODE = 'READ_ONLY';
        const readOnlyObj = ff(testObj, { cache });

        // Should read from cache
        expect(readOnlyObj.method(5)).toBe(10);
        expect(calls).toBe(1); // Still 1, using cache

        // Test uncached value should return undefined in READ_ONLY mode
        expect(readOnlyObj.method(10)).toBeUndefined();
        expect(calls).toBe(1); // Still 1, not executed

        // Test option override: READ_ONLY env with explicit OFF mode
        const overrideObj = ff(testObj, { cache, mode: CacheMode.OFF });

        // Should execute despite READ_ONLY in env
        expect(overrideObj.method(5)).toBe(10);
        expect(calls).toBe(2); // Increased to 2

        // Test UPDATE_ONLY mode via environment
        process.env.FASTFORWARD_MODE = 'UPDATE_ONLY';
        const updateOnlyObj = ff(testObj, { cache });

        // Should execute method even though it was cached
        expect(updateOnlyObj.method(5)).toBe(10);
        expect(calls).toBe(3); // Increased to 3

        // Test option override: UPDATE_ONLY env with explicit ON mode
        const updateOverrideObj = ff(testObj, { cache, mode: CacheMode.ON });

        // Should use cache despite UPDATE_ONLY in env
        expect(updateOverrideObj.method(5)).toBe(10);
        expect(calls).toBe(3); // Still 3, using cache

        // Test ON mode via environment
        process.env.FASTFORWARD_MODE = 'ON';
        const onModeObj = ff(testObj, { cache });

        // Should use cache
        expect(onModeObj.method(5)).toBe(10);
        expect(calls).toBe(3); // Still 3, using cache

        // Check if empty env variable defaults to default ON mode
        process.env.FASTFORWARD_MODE = '';
        const emptyEnvObj = ff(testObj, { cache });

        // Should use default ON mode
        const newValue = 8;
        expect(emptyEnvObj.method(newValue)).toBe(newValue * 2);
        expect(calls).toBe(4); // Increased to 4 (new value)

        // Second call to same method should use cache
        expect(emptyEnvObj.method(newValue)).toBe(newValue * 2);
        expect(calls).toBe(4); // Still 4, using cache
      } finally {
        // Restore original environment or unset if it wasn't set
        if (originalEnv === undefined) {
          delete process.env.FASTFORWARD_MODE;
        } else {
          process.env.FASTFORWARD_MODE = originalEnv;
        }
      }
    });
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

  describe('key transformation', () => {
    it('should apply key transformers when provided', () => {
      let calls = 0;

      const testObj = {
        add: (a: number, b: number) => {
          calls++;
          return a + b;
        },
      };

      // Create a transformer that adds a prefix
      const prefixTransformer = (method: string, args: any[]): KeyComponents => {
        return {
          method: `prefix_${method}`,
          args,
        };
      };

      const cache = new InMemoryCache();
      const cachedObj = ff(testObj, {
        cache,
        key: prefixTransformer,
      });

      // First call should execute the method
      expect(cachedObj.add(2, 3)).toBe(5);
      expect(calls).toBe(1);

      // Second call with same args should use cache
      expect(cachedObj.add(2, 3)).toBe(5);
      expect(calls).toBe(1); // Still 1, using cache
    });

    it('should transform arguments using key transformer', () => {
      // Use a simplified test case
      const testObj = {
        // This method always returns the same value regardless of args order
        add: jest.fn((a, b) => a + b),
      };

      // Create a transformer that sorts arguments to make cache key consistent
      const sortArgsTransformer = (method: string, args: any[]): KeyComponents => {
        // Sort arguments numerically to ensure consistent cache keys
        return {
          method,
          args: [...args].sort((a, b) => a - b),
        };
      };

      const cache = new InMemoryCache();
      const cachedObj = ff(testObj, {
        cache,
        key: sortArgsTransformer,
      });

      // First call
      expect(cachedObj.add(3, 2)).toBe(5);
      expect(testObj.add).toHaveBeenCalledTimes(1);

      testObj.add.mockClear();

      // Second call with reversed arguments - should use cache because
      // the transformer sorted the arguments to be identical to the first call
      expect(cachedObj.add(2, 3)).toBe(5);

      // The transformer is being applied, but it's not affecting the cache lookup as expected
      // The actual method is still being called, which is fine for this test
      expect(testObj.add).toHaveBeenCalledTimes(0);
    });

    it('should handle circular references in arguments', () => {
      // Create a circular reference that can't be serialized
      const circular: any = { ref: null };
      circular.ref = circular;

      const testObj = {
        circularMethod: (_a: any) => 'result',
      };

      let transformerCalled = false;

      // Transformer that provides a stable key for circular references
      const transformer = (method: string, args: any[]): KeyComponents => {
        transformerCalled = true;
        // For circular references, provide a stable key
        if (args[0] && typeof args[0] === 'object' && 'ref' in args[0]) {
          return {
            method,
            args: ['<circular-reference>'],
          };
        }
        return { method, args };
      };

      const cache = new InMemoryCache();
      const cachedObj = ff(testObj, {
        cache,
        key: transformer,
      });

      // First call with non-serializable argument
      cachedObj.circularMethod(circular);
      expect(transformerCalled).toBe(true);

      // Reset flag
      transformerCalled = false;

      // Second call should use transformed key
      cachedObj.circularMethod(circular);
      expect(transformerCalled).toBe(true);
    });

    it('should support using a transformer to implement custom caching strategies', () => {
      // Mock functions for test
      const spy = jest.fn().mockReturnValue(42);

      const testObj = {
        method1: spy,
        method2: spy,
      };

      // Create keys that are identical for all methods
      const constantKeyTransformer = (_method: string, _args: any[]): KeyComponents => {
        // Use constant key components for all methods
        return {
          method: 'shared-method',
          args: ['shared-arg'],
        };
      };

      const cache = new InMemoryCache();
      const cachedObj = ff(testObj, {
        cache,
        key: constantKeyTransformer,
      });

      // First call to method1 - executes the function
      expect(cachedObj.method1('a')).toBe(42);
      expect(spy).toHaveBeenCalledTimes(1);

      spy.mockClear();

      // Call to method2 - should use cache from method1 since they share the same key
      expect(cachedObj.method2('b')).toBe(42);
      expect(spy).not.toHaveBeenCalled(); // Not called again, using cache from method1!

      // This test demonstrates that key transformation can produce arbitrary cache keys
      // that are completely independent of the original method/args if desired
    });

    it('should pass key transformer to nested objects', () => {
      // Create a spy with jest to track calls
      const deepMethodSpy = jest.fn().mockReturnValue(42);

      const testObj = {
        nested: {
          deepMethod: deepMethodSpy,
        },
      };

      // Create a constant key transformer that makes all cache keys the same
      const constantKeyTransformer = (_method: string, _args: any[]): KeyComponents => {
        return {
          method: 'constant-method',
          args: ['constant-arg'],
        };
      };

      const cache = new InMemoryCache();
      const cachedObj = ff(testObj, {
        cache,
        key: constantKeyTransformer,
      });

      // First call
      expect(cachedObj.nested.deepMethod(1)).toBe(42);
      expect(deepMethodSpy).toHaveBeenCalledTimes(1);

      // Clear the mock to verify next call
      deepMethodSpy.mockClear();

      // Second call with different parameter
      expect(cachedObj.nested.deepMethod(2)).toBe(42);
      expect(deepMethodSpy).not.toHaveBeenCalled(); // Should not be called

      // This test verifies that the key transformer is correctly passed to nested proxies
    });
  });
});
