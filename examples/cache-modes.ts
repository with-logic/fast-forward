// Example demonstrating different cache modes
import { fastForward, CacheMode, InMemoryCache } from '../src';

// Create a simple calculator with a counter to track method calls
let addCalls = 0;
const calculator = {
  add: (a: number, b: number): number => {
    addCalls++;
    console.log(`Calculating add(${a}, ${b})...`);
    return a + b;
  },
};

// Create a shared cache for this example
const cache = new InMemoryCache();

// Create different instances with different cache modes
const defaultCalc = fastForward(calculator, { cache });
const offModeCalc = fastForward(calculator, { cache, mode: CacheMode.OFF });
const updateOnlyCalc = fastForward(calculator, { cache, mode: CacheMode.UPDATE_ONLY });
const readOnlyCalc = fastForward(calculator, { cache, mode: CacheMode.READ_ONLY });

async function demoDefaultMode() {
  console.log('\n--- DEFAULT MODE (CacheMode.ON) ---');
  console.log('First call:', defaultCalc.add(1, 2)); // Should execute and cache
  console.log('Second call:', defaultCalc.add(1, 2)); // Should use cache
  console.log('New args:', defaultCalc.add(3, 4)); // Should execute and cache
  console.log(`Method executed ${addCalls} times`);
}

async function demoOffMode() {
  console.log('\n--- OFF MODE ---');
  const startCalls = addCalls;
  console.log('First call:', offModeCalc.add(1, 2)); // Should execute (no caching)
  console.log('Second call:', offModeCalc.add(1, 2)); // Should execute again
  console.log(`Method executed ${addCalls - startCalls} times (always executes)`);
}

async function demoUpdateOnlyMode() {
  console.log('\n--- UPDATE ONLY MODE ---');
  const startCalls = addCalls;
  console.log('First call:', updateOnlyCalc.add(5, 6)); // Should execute and cache
  console.log('Second call:', updateOnlyCalc.add(5, 6)); // Should execute again and update cache
  // Check if value was cached by using the default mode instance
  console.log('From cache:', defaultCalc.add(5, 6)); // Should use latest cached value
  console.log(`Method executed ${addCalls - startCalls} times (always executes but caches)`);
}

async function demoReadOnlyMode() {
  console.log('\n--- READ ONLY MODE ---');
  const startCalls = addCalls;

  // Pre-populate cache with a value
  defaultCalc.add(7, 8);

  // Now try read-only mode
  console.log('Cached value:', readOnlyCalc.add(7, 8)); // Should read from cache
  console.log('Uncached value:', readOnlyCalc.add(9, 10)); // Should return undefined
  console.log(`Method executed ${addCalls - startCalls - 1} times (only reads cache)`);
}

async function demoEnvironmentVariable() {
  console.log('\n--- ENVIRONMENT VARIABLES AND OPTION OVERRIDES ---');

  // Save original
  const original = process.env.FASTFORWARD_MODE;

  // Set environment variable to OFF
  process.env.FASTFORWARD_MODE = 'OFF';
  console.log('Setting process.env.FASTFORWARD_MODE = "OFF"');

  // First, demonstrate environment variables without explicit options
  const envStartCalls = addCalls;
  const envCalc = fastForward(calculator, { cache });

  console.log('With env only:');
  console.log('First call:', envCalc.add(1, 2)); // Should execute
  console.log('Second call:', envCalc.add(1, 2)); // Should execute again (no caching due to OFF mode)
  console.log(`Method executed ${addCalls - envStartCalls} times (using OFF mode from env)`);

  // Now demonstrate explicit options overriding environment variable
  console.log('\nWith explicit mode option:');
  const explicitStartCalls = addCalls;
  const explicitCalc = fastForward(calculator, { cache, mode: CacheMode.ON });

  console.log('First call:', explicitCalc.add(1, 2)); // Should execute
  console.log('Second call:', explicitCalc.add(1, 2)); // Should use cache (ON mode overrides env OFF)
  console.log(
    `Method executed ${addCalls - explicitStartCalls} times (explicit ON mode overrides env OFF)`
  );

  // Test with invalid environment variable
  process.env.FASTFORWARD_MODE = 'INVALID_VALUE';
  console.log('\nSetting process.env.FASTFORWARD_MODE = "INVALID_VALUE"');
  const fallbackCalc = fastForward(calculator, { cache });
  const fallbackStart = addCalls;

  console.log('Fallback call:', fallbackCalc.add(1, 2)); // Should use cache (fallback to default ON)
  console.log(
    `Method executed ${addCalls - fallbackStart} times (invalid env falls back to default ON mode)`
  );

  // Restore original
  if (original === undefined) {
    delete process.env.FASTFORWARD_MODE;
  } else {
    process.env.FASTFORWARD_MODE = original;
  }
}

// Run all demos
async function runDemo() {
  await demoDefaultMode();
  await demoOffMode();
  await demoUpdateOnlyMode();
  await demoReadOnlyMode();
  await demoEnvironmentVariable();
}

runDemo().catch(console.error);
