import { fastForward, InMemoryCache, type KeyComponents } from '../src';

// Create an object with methods to cache
const api = {
  fetchUser: (userId: string, timestamp: number) => {
    console.log(`Fetching user data for ID ${userId} at ${timestamp}...`);
    // Simulating an API call
    return { id: userId, name: `User ${userId}`, lastUpdated: timestamp };
  },

  fetchProduct: (productId: string, options: { includeReviews: boolean; timestamp: number }) => {
    console.log(`Fetching product ${productId} with options:`, options);
    // Simulating an API call
    return {
      id: productId,
      name: `Product ${productId}`,
      reviews: options.includeReviews ? ['Great!', 'Awesome!'] : [],
      lastUpdated: options.timestamp,
    };
  },
};

/**
 * Example 1: Basic key transformation
 *
 * Add a prefix to all method names for better organization
 */
console.log('\n--- Example 1: Basic Key Transformation ---');

const prefixTransformer = (method: string, args: any[]): KeyComponents => {
  return {
    method: `api_${method}`, // Add prefix to method name
    args, // Keep args the same
  };
};

const prefixedApi = fastForward(api, {
  cache: new InMemoryCache(),
  key: prefixTransformer,
});

// First call - will execute and cache with prefix
console.log(prefixedApi.fetchUser('123', Date.now()));

// Second call - should use cache despite different timestamp
console.log(prefixedApi.fetchUser('123', Date.now() + 1000));

/**
 * Example 2: Ignoring certain parameters in cache keys
 *
 * Ignore timestamp parameter that changes between calls but shouldn't
 * invalidate the cache
 */
console.log('\n--- Example 2: Ignoring Volatile Parameters ---');

const ignoreTimestampTransformer = (method: string, args: any[]): KeyComponents => {
  // Make a copy of the arguments array to avoid modifying the original
  const stableArgs = [...args];

  // Handle different methods differently
  if (method === 'fetchUser' && args.length >= 2) {
    // For fetchUser, remove the timestamp (second parameter)
    stableArgs[1] = null; // Replace timestamp with null
  } else if (method === 'fetchProduct' && args.length >= 2 && typeof args[1] === 'object') {
    // For fetchProduct, remove the timestamp from options object
    if (args[1].timestamp !== undefined) {
      stableArgs[1] = { ...args[1], timestamp: null };
    }
  }

  return {
    method,
    args: stableArgs,
  };
};

const stableApi = fastForward(api, {
  cache: new InMemoryCache(),
  key: ignoreTimestampTransformer,
});

// First call - will execute and cache
console.log(stableApi.fetchUser('456', Date.now()));

// Second call with different timestamp - should use cache
console.log(stableApi.fetchUser('456', Date.now() + 5000));

// Product API with options object containing timestamp
console.log(stableApi.fetchProduct('101', { includeReviews: true, timestamp: Date.now() }));

// Should use cache despite different timestamp in options
console.log(stableApi.fetchProduct('101', { includeReviews: true, timestamp: Date.now() + 10000 }));

// Different product ID - will execute
console.log(stableApi.fetchProduct('102', { includeReviews: false, timestamp: Date.now() }));

/**
 * Example 3: Custom cache key generation
 *
 * Generate completely custom cache keys based on semantic meaning of
 * parameters rather than their exact values
 */
console.log('\n--- Example 3: Custom Cache Key Strategy ---');

const customKeyTransformer = (method: string, args: any[]): KeyComponents => {
  if (method === 'fetchUser' && args.length >= 1) {
    // For user data, only use the user ID for the cache key
    return {
      method: 'user', // Transform method name to reflect content type
      args: [args[0]], // Only keep the user ID
    };
  }

  if (method === 'fetchProduct' && args.length >= 2 && typeof args[1] === 'object') {
    // For products, only care about product ID and whether reviews are included
    const productId = args[0];
    const includeReviews = args[1].includeReviews || false;

    return {
      method: 'product',
      args: [productId, { includeReviews }], // Omit timestamp and other details
    };
  }

  // Default fallback for other methods
  return { method, args };
};

const customKeyApi = fastForward(api, {
  cache: new InMemoryCache(),
  key: customKeyTransformer,
});

// First call - will execute and use custom key format
console.log(customKeyApi.fetchUser('789', Date.now()));

// Second call with different timestamp - should use custom cache key
console.log(customKeyApi.fetchUser('789', Date.now() + 15000));

// Product API with custom key including review status
console.log(customKeyApi.fetchProduct('201', { includeReviews: true, timestamp: Date.now() }));

// Should use cache because it matches the custom key pattern
console.log(
  customKeyApi.fetchProduct('201', { includeReviews: true, timestamp: Date.now() + 20000 })
);

// Different review setting changes the key, so this will execute
console.log(customKeyApi.fetchProduct('201', { includeReviews: false, timestamp: Date.now() }));
