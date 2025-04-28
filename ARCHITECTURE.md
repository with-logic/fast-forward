# Fast-Forward Architecture

Fast-Forward is a TypeScript library that provides transparent method call caching through JavaScript's Proxy mechanism. This document outlines the architecture, core components, and design patterns used in the codebase.

## Core Architecture

The library is built around these key components:

1. **The `fastForward` function**: The main entry point that wraps objects in a cache-aware Proxy
2. **Cache implementations**: Two provided cache strategies (InMemoryCache and FileSystemCache)
3. **Cache modes**: Control behavior through environment variables or explicit settings
4. **Key transformers**: Customize cache keys through transformation functions

### Component Structure

```
┌─────────────────┐      ┌─────────────┐
│   fastForward   │─────▶│    Proxy    │
└─────────────────┘      └──────┬──────┘
         │                      │
         │                      ▼
         │               ┌─────────────┐
         │               │ Method Call │
         │               │ Interception│
         │               └──────┬──────┘
         │                      │
         ▼                      ▼
┌─────────────────┐      ┌─────────────┐
│  Cache Strategy │◀────▶│ Cache Logic │
└─────────────────┘      └─────────────┘
```

## Key Components

### 1. Fast-Forward Core (`fast-forward.ts`)

The central module implementing the Proxy-based caching logic:

- Takes an object and wraps it in a Proxy
- Intercepts method calls to check the cache before execution
- Recursively wraps nested object properties
- Handles promise-based method calls

### 2. Cache Implementations

#### InMemoryCache (`in-memory-cache.ts`)

- Simple Map-based non-persistent cache
- Fast but ephemeral (lost on application restart)
- Ideal for temporary caching needs

#### FileSystemCache (`filesystem-cache.ts`) 

- Persistent JSON file-based cache
- Stores each entry as a separate file with SHA-256 hashed filenames
- Supports namespaces for organizing cached data
- Provides human-readable cache files for debugging

### 3. Type Definitions (`types.ts`)

- Defines the `Cache` interface that implementations must satisfy
- Provides `CacheMode` enum to control caching behavior
- Defines the `KeyTransformer` type for cache key transformation
- Defines option types for consistent configuration

### 4. Utilities (`utils.ts`)

- Helper functions for cache key generation (using `json-stable-stringify` for consistency)
- Applies key transformers to modify cache keys when needed
- Type guards and validators
- Cache mode parsing from environment variables

## Core Design Patterns

1. **Proxy Pattern**: The core caching mechanism uses JavaScript's Proxy to intercept method calls.

2. **Strategy Pattern**: Different cache implementations (in-memory, filesystem) follow the same interface.

3. **Factory Pattern**: The `fastForward` function acts as a factory, creating proxy-wrapped objects.

4. **Decorator Pattern**: Conceptually, the caching layer decorates the original object's methods.

## Key Transformation

The library supports custom cache key transformation through the `KeyTransformer` function type:

```typescript
// Return type from the key transformer
interface KeyComponents {
  method: string;
  args: any[];
}

// Function type for transforming cache keys
type KeyTransformer = (method: string, args: any[]) => KeyComponents;
```

Key transformers are applied in the `generateCacheKey` utility function:

1. The key transformer is called with the method name and arguments array
2. The transformer returns potentially modified method and arguments
3. These transformed components are then used to generate the final cache key
4. The resulting key is used for cache lookups

This enables powerful customization patterns:

- **Ignoring volatile parameters**: Exclude timestamps, random IDs, or other changing values that shouldn't invalidate cache
- **Normalizing arguments**: Transform arguments into a canonical form for consistent caching
- **Cross-method caching**: Map different methods to the same cache entry when appropriate
- **Semantic caching**: Group cache entries based on meaning rather than literal method names
- **Custom argument handling**: Provide special handling for circular references or other complex objects

## Caching Behavior

The library supports four caching modes, controlled through the `CacheMode` enum:

1. **ON** (default): Read from cache if available, compute and cache if not
2. **OFF**: Disable caching, always compute fresh results
3. **UPDATE_ONLY**: Always compute fresh results, but update cache for future use
4. **READ_ONLY**: Only read from cache, return undefined if not found

## Configuration System

Configuration can be provided in several ways:

1. **Explicit options**: Passed directly to the `fastForward` function
   - Cache implementation via `cache` property
   - Cache mode via `mode` property
   - Key transformer via `key` property
2. **Environment variables**: Using `FASTFORWARD_MODE` to set cache mode globally

Explicit options take precedence over environment variables.

## Promise Handling

The library provides special handling for promises:

- Returned promises are tracked and their resolved values are cached
- Rejected promises are not cached (will be re-executed on next call)
- Cached promises are returned as new pre-resolved promises

## Extension Points

The library can be extended through:

1. **Custom cache implementations**: Create classes that implement the `Cache` interface
2. **Key transformers**: Customize cache key generation logic
3. **External cache invalidation**: Manually clear caches or manage the cache files