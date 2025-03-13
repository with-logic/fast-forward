import tseslint from 'typescript-eslint';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Ignore some files entirely
  {
    ignores: ['dist/**', 'coverage/**', 'jest.config.js'],
  },
  
  // TypeScript recommended rules (without no-explicit-any)
  ...tseslint.configs.recommended.map(config => {
    if (config && config.rules && config.rules['@typescript-eslint/no-explicit-any']) {
      return {
        ...config,
        rules: {
          ...config.rules,
          '@typescript-eslint/no-explicit-any': 'off'
        }
      }
    }
    return config;
  }),
  
  // Include Prettier config
  prettierConfig,
  
  // Base config for all TS files
  {
    files: ['**/*.ts'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'prettier': eslintPluginPrettier
    },
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Node.js globals
        process: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'writable',
        require: 'readonly',
        // Jest globals
        jest: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly'
      }
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      "@typescript-eslint/no-unsafe-function-type": "off",
    }
  },
  
  // Source files with strict type checking
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json'
      }
    }
  }
];
