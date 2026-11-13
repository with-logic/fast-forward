# CLAUDE.md

This file provides guidance to coding agents working in this repository.

# Fast-Forward Project Guidelines

See ARCHITECTURE.md for details about the project architecture, components, and design patterns.

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

## Required local review

This section applies to local coding-agent sessions only. A hosted CI review
gets its instructions from the workflow. In hosted CI, do not run Crew and do not
treat missing Crew as a failed review.

This step needs read access to `with-logic/skills`, which is private to Logic.
If you do not have that access (Crew reports that it cannot reach
`with-logic/skills`), skip the local review. This is not a failed preparation:
do not ask the user about it, and say in the pull request that the local review
was skipped.

Run the local review before you open a pull request. It does not replace the
hosted review, which stays the merge requirement.

Prepare each required local review in the existing coding-agent session. From this
repository root, run `crew version` and `crew install --latest --json` with a
command timeout. Require the published Crew release that
README.md#shared-local-review names. Then read the updated project
`review/SKILL.md`: `.agents/skills/review/SKILL.md` for Codex or
`.claude/skills/review/SKILL.md` for Claude Code. Follow its shared preparation
procedure to verify this agent's full roster, helper and source records, then
continue `/review` in this session. Refresh once per invocation.

Failed preparation stops required review. A successful `npm install`, a
`no_agents` result, or another agent's install does not prove readiness. Do not
use stale or personal skills as a fallback. See README.md#shared-local-review
for recovery. If you cannot recover the preparation, report the local review as
not run and ask the user before you open the pull request. Do not commit files
under `.agents/skills/` or `.claude/skills/` that Crew installed.

The shared procedure includes proposed PR title and body text from the separately
installed pull-request-description helper. This local step does not edit the PR
or change the code-review verdict. Keep `.crewrc` and its generated lock tracked;
keep downloaded copies ignored and lock changes visible for review. Do not
refresh while reviewers run or add a repository-specific review loader.
