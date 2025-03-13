import {
  generateCacheKey,
  isMethod,
  isObject,
  isCache,
  isFastForwardOptions,
  parseCacheMode,
} from '../src/utils';
import { CacheMode } from '../src/types';

// Create a mock Cache implementation for testing
const mockCache = {
  get: (_key: string | undefined) => undefined,
  set: (_key: string | undefined, _value: any) => {},
  has: (_key: string | undefined) => false,
  delete: (_key: string | undefined) => false,
  clear: () => {},
};

describe('Utils', () => {
  describe('generateCacheKey', () => {
    it('should generate consistent cache keys', () => {
      const methodName = 'testMethod';
      const args = [1, 'test', { a: 1, b: 2 }];

      const key = generateCacheKey(methodName, args);

      // The key should be a string and contain the method name
      expect(typeof key).toBe('string');
      expect(key!.startsWith(methodName)).toBe(true);

      // Generate the key again with the same inputs
      const key2 = generateCacheKey(methodName, args);

      // Keys should be identical for the same inputs
      expect(key).toBe(key2);
    });

    it('should handle different object property orders', () => {
      const methodName = 'testMethod';

      // Create two arrays with objects that have the same properties in different orders
      const args1 = [{ a: 1, b: 2, c: 3 }];
      const args2 = [{ c: 3, b: 2, a: 1 }];

      const key1 = generateCacheKey(methodName, args1);
      const key2 = generateCacheKey(methodName, args2);

      // Keys should be identical despite different property orders
      expect(key1).toBe(key2);
    });

    it('should handle circular references gracefully', () => {
      const methodName = 'testMethod';

      // Create an object with a circular reference
      const circular: any = { name: 'test' };
      circular.self = circular; // Create circular reference

      const args = [circular];

      // This should not throw an error
      const key = generateCacheKey(methodName, args);

      // The key should be a string and contain the method name
      expect(key).toBeUndefined();
    });
  });

  describe('isMethod', () => {
    it('should identify methods correctly', () => {
      const obj = {
        method: function () {},
        arrowMethod: () => {},
        notMethod: 'string',
        anotherNotMethod: 42,
        [Symbol('symbolMethod')]: function () {},
      };

      // Test regular function
      expect(isMethod(obj, 'method')).toBe(true);

      // Test arrow function
      expect(isMethod(obj, 'arrowMethod')).toBe(true);

      // Test non-methods
      expect(isMethod(obj, 'notMethod')).toBe(false);
      expect(isMethod(obj, 'anotherNotMethod')).toBe(false);

      // Test Symbol property that is a method
      const symbolKey = Object.getOwnPropertySymbols(obj)[0];
      expect(isMethod(obj, symbolKey)).toBe(true);
    });
  });

  describe('isObject', () => {
    it('should identify objects correctly', () => {
      expect(isObject({})).toBe(true);
      expect(isObject(new Date())).toBe(true);
      expect(isObject([])).toBe(false);
      expect(isObject('string')).toBe(false);
      expect(isObject(42)).toBe(false);
      expect(isObject(null)).toBe(false);
      expect(isObject(undefined)).toBe(false);
    });
  });

  describe('isCache', () => {
    it('should identify Cache implementations correctly', () => {
      // Valid Cache implementation
      expect(isCache(mockCache)).toBe(true);

      // Invalid implementations
      expect(isCache({})).toBe(false);
      expect(isCache(null)).toBe(false);
      expect(isCache(undefined)).toBe(false);
      expect(isCache('string')).toBe(false);
      expect(isCache(42)).toBe(false);

      // Partial implementations
      expect(isCache({ get: () => {}, set: () => {} })).toBe(false);
      expect(
        isCache({
          get: () => {},
          set: () => {},
          has: () => false,
          delete: () => false,
          // missing clear
        })
      ).toBe(false);
    });
  });

  describe('isFastForwardOptions', () => {
    it('should identify FastForwardOptions correctly', () => {
      // Valid options
      expect(isFastForwardOptions({})).toBe(true);
      expect(isFastForwardOptions({ cache: mockCache })).toBe(true);
      expect(isFastForwardOptions({ mode: CacheMode.ON })).toBe(true);
      expect(isFastForwardOptions({ cache: mockCache, mode: CacheMode.OFF })).toBe(true);

      // Invalid options
      expect(isFastForwardOptions(null)).toBe(false);
      expect(isFastForwardOptions(undefined)).toBe(false);
      expect(isFastForwardOptions('string')).toBe(false);
      expect(isFastForwardOptions(42)).toBe(false);

      // Invalid cache property
      expect(isFastForwardOptions({ cache: {} })).toBe(false);
      expect(isFastForwardOptions({ cache: 'not a cache' })).toBe(false);

      // Invalid mode property
      expect(isFastForwardOptions({ mode: 'invalid' })).toBe(false);
      expect(isFastForwardOptions({ mode: 123 })).toBe(false);
    });
  });

  describe('parseCacheMode', () => {
    it('should parse valid cache mode strings', () => {
      expect(parseCacheMode('ON')).toBe(CacheMode.ON);
      expect(parseCacheMode('OFF')).toBe(CacheMode.OFF);
      expect(parseCacheMode('UPDATE_ONLY')).toBe(CacheMode.UPDATE_ONLY);
      expect(parseCacheMode('READ_ONLY')).toBe(CacheMode.READ_ONLY);

      // Case insensitivity
      expect(parseCacheMode('on')).toBe(CacheMode.ON);
      expect(parseCacheMode('Off')).toBe(CacheMode.OFF);
      expect(parseCacheMode('update_only')).toBe(CacheMode.UPDATE_ONLY);
      expect(parseCacheMode('read_ONLY')).toBe(CacheMode.READ_ONLY);
    });

    it('should handle invalid or empty input', () => {
      expect(parseCacheMode('')).toBeUndefined();
      expect(parseCacheMode('   ')).toBeUndefined();
      expect(parseCacheMode(undefined)).toBeUndefined();
      expect(parseCacheMode('INVALID_MODE')).toBeUndefined();
      expect(parseCacheMode('123')).toBeUndefined();
    });
  });
});
