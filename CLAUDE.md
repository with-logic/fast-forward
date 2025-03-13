# Fast-Forward Project Guidelines

## Build and Test Commands
```bash
npm run build        # Build the project
npm run lint         # Run linter
npm run format       # Format code with prettier
npm test             # Run all tests with coverage checks
npm run test:watch   # Run tests in watch mode
npm test -- -t "should cache method calls"  # Run a single test matching pattern
```

## Code Style Guidelines
- **TypeScript**: Strict mode enabled with all strict flags
- **Naming**: Use camelCase for variables/functions, PascalCase for classes/interfaces
- **Formatting**: Single quotes, 100 char line limit, 2 space indent
- **Types**: Prefer explicit typing, avoid `any` when possible (disabled in eslint)
- **Documentation**: JSDoc for public interfaces and methods
- **Error Handling**: Use type guards and null checks; avoid try/catch unless needed
- **Imports**: Group imports by external/internal with a blank line separator
- **Testing**: 100% coverage required (statements, branches, functions, lines)
- **Prefixing**: Use underscore prefix (`_param`) for unused parameters

## MOST IMPORTANT
Never ever ever modify the jest.config.js file. It must remain fixed at 100%
coverage for everything.

In testing, minimize use of mocks, spies, etc. Test code by running it
normally, even if it has side-effects like writing to disk.
