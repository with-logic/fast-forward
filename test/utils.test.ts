import { generateCacheKey, isMethod, isObject } from '../src/utils';

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
});
