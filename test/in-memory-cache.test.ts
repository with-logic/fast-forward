import { InMemoryCache } from '../src/in-memory-cache';

describe('InMemoryCache', () => {
  let cache: InMemoryCache;

  beforeEach(() => {
    cache = new InMemoryCache();
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
    const result = cache.delete('nonexistent');
    expect(result).toBe(false);
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
    const complexObj = { a: [1, 2, { b: 3 }], c: new Date() };
    cache.set('complex', complexObj);
    expect(cache.get('complex')).toEqual(complexObj);
  });
});
