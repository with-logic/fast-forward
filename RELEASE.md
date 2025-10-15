# Release Process

This document describes how to release a new version of `@with-logic/fast-forward`.

## Overview

Releases are fully automated. You only need to:
1. Run a script to create a release PR
2. Merge the PR after review
3. GitHub Actions handles the rest automatically

## Prerequisites

Before releasing, ensure you have:

- **Write access** to the repository
- **GitHub CLI** installed and authenticated (`gh auth login`)
- **npm access** (only needed for manual intervention if automation fails)

## Standard Release Process

### Step 1: Ensure Main is Up to Date

```bash
git checkout main
git pull origin main
```

Make sure your working directory is clean with no uncommitted changes.

### Step 2: Run the Prepare Release Script

```bash
npm run prepare-release
```

The script will:
- ✅ Verify you're on the main branch with a clean working directory
- ✅ Fetch the latest published version from git tags
- ✅ Prompt you to select a version bump (patch/minor/major)
- ✅ Create a release branch (e.g., `release/v0.1.12`)
- ✅ Update `package.json` and create a version commit
- ✅ Create a git tag
- ✅ Push the branch and tag to GitHub
- ✅ Open a pull request to main with the `release` label

**Example output:**
```
📦 Fast-Forward - Release Preparation
══════════════════════════════════════════════════
✓ On main branch
✓ Working directory is clean

package.json version: 0.1.9
Latest published version: 0.1.11

💡 Note: Will bump from latest published version (0.1.11)

Select version bump:
  1) patch  → 0.1.12 (bug fixes)
  2) minor  → 0.2.0 (new features)
  3) major  → 1.0.0 (breaking changes)

Enter your choice (1-3): 1
```

### Step 3: Review and Merge the PR

1. **Review the PR** on GitHub
   - Verify the version number is correct in `package.json`
   - Ensure all CI checks pass
   - Check that only version-related changes are included

2. **Get approval** from a team member (if required by branch protection)

3. **Merge the PR** to main

### Step 4: Automation Takes Over

Once the PR is merged, GitHub Actions automatically:

1. **Creates the GitHub release** ([auto-release.yml](.github/workflows/auto-release.yml))
   - Triggered by PR merge
   - Generates release notes from commits
   - Tags the release

2. **Publishes packages** ([publish.yml](.github/workflows/publish.yml))
   - Triggered by release creation
   - Runs tests and builds
   - Publishes to public npm registry
   - Publishes to GitHub Packages

**Monitor progress:**
- [GitHub Actions](https://github.com/with-logic/fast-forward/actions)
- Look for "Auto Release on PR Merge" and "Publish Package" workflows

**No manual steps required!** ✨

## Version Strategy

We follow [Semantic Versioning](https://semver.org/):

- **Patch (0.0.x)**: Bug fixes, minor changes, backward compatible
  - Example: Fix a bug, update dependencies, improve documentation

- **Minor (0.x.0)**: New features, backward compatible
  - Example: Add new methods, add new options, deprecate (but not remove) functionality

- **Major (x.0.0)**: Breaking changes
  - Example: Remove deprecated APIs, change method signatures, change behavior

## What Gets Published

When a release is created, packages are published to:

### 1. Public npm Registry (`registry.npmjs.org`)
```bash
npm install @with-logic/fast-forward
```
- Public access for all users
- Primary distribution method

### 2. GitHub Packages (`npm.pkg.github.com`)
```bash
npm install @with-logic/fast-forward
```
- Requires GitHub authentication
- Available for organization use

## Troubleshooting

### PR Created But Automation Didn't Trigger

**Symptoms:** PR was merged but no release was created.

**Possible causes:**
- Branch name doesn't start with `release/`
- PR title doesn't start with `Release v`
- PR is missing the `release` label
- PR was closed without merging

**How to check:**
1. Go to [GitHub Actions](https://github.com/with-logic/fast-forward/actions)
2. Look for "Auto Release on PR Merge" workflow
3. Check if it ran and what the logs say

**Fix:**
You can manually trigger release creation:
```bash
# Get the version from package.json
VERSION=$(node -p "require('./package.json').version")

# Create the release manually
gh release create v$VERSION --title "Release v$VERSION" --generate-notes
```

This will trigger the publish workflow.

### Tag Already Exists

**Symptoms:** `prepare-release` script fails with "Tag already exists" error.

**Cause:** You're trying to release a version that's already been released.

**Fix:**
```bash
# Check existing tags
git tag -l | sort -V

# The script should have detected this, but if not:
# Run prepare-release again and select the correct version bump
npm run prepare-release
```

### Working Directory Not Clean

**Symptoms:** Script exits with "Working directory not clean" error.

**Cause:** You have uncommitted changes.

**Fix:**
```bash
# Option 1: Stash your changes
git stash

# Option 2: Commit your changes
git add .
git commit -m "Your changes"

# Then run prepare-release again
npm run prepare-release
```

### Version Mismatch Between package.json and Git Tag

**Symptoms:** Publish workflow fails with version validation error.

**Cause:** The git tag version doesn't match package.json version.

**This should never happen** if you use the `prepare-release` script, as it updates both atomically.

**Fix:**
```bash
# Check versions
cat package.json | grep version
git tag -l | sort -V | tail -1

# If they don't match, you may need to manually fix:
# 1. Update package.json to match the tag
# 2. Commit the change
# 3. Manually create the release
```

### Publish Workflow Failed

**Symptoms:** Release was created but packages weren't published.

**Possible causes:**
- npm authentication issues
- Tests failed
- Build errors
- Network issues

**Fix:**
1. Go to [GitHub Actions](https://github.com/with-logic/fast-forward/actions)
2. Find the failed "Publish Package" workflow
3. Check the logs to identify the issue
4. Fix the underlying problem (may require a new commit)
5. Re-run the workflow from the GitHub Actions UI

### Emergency: Manual Package Publishing

If automation completely fails and you need to publish manually:

```bash
# 1. Ensure you're on main with correct version
git checkout main
git pull

# 2. Verify version in package.json matches the tag
VERSION=$(node -p "require('./package.json').version")
git tag -l "v$VERSION"

# 3. Run tests and build locally
npm test
npm run build

# 4. Publish to public npm (requires npm auth)
npm publish --access public

# 5. Publish to GitHub Packages (requires GitHub auth)
npm config set registry https://npm.pkg.github.com
npm publish
npm config set registry https://registry.npmjs.org
```

**Note:** This should be a last resort. Prefer fixing the automation.

## Release Checklist

### Before Running prepare-release
- [ ] All PRs for this release are merged to main
- [ ] CI is green on main branch
- [ ] You're on the main branch: `git branch --show-current`
- [ ] Working directory is clean: `git status`
- [ ] You've pulled latest changes: `git pull`

### After Merging Release PR
- [ ] Auto-release workflow completed successfully
- [ ] Publish workflow completed successfully
- [ ] Package is available on npm: `npm view @with-logic/fast-forward`
- [ ] GitHub release is published: [Releases](https://github.com/with-logic/fast-forward/releases)

## Important Notes

### Package Version in Main Branch

The `package.json` version in the main branch **may lag behind** published versions. This is expected behavior.

**Example:**
- Main branch `package.json`: `0.1.9`
- Latest git tag: `v0.1.12`
- Latest published version: `0.1.12`

The `prepare-release` script automatically syncs versions by:
1. Reading the latest git tag (source of truth)
2. Calculating the next version from that tag
3. Updating `package.json` to the new version

**Always use git tags** as the source of truth for published versions.

### Branch Protection

Release PRs go through the same review process as code PRs:
- Require approval (if configured)
- Run CI checks
- Enforce branch protection rules

This ensures releases are reviewed and approved before publishing.

### Rollback

If you need to rollback a release:

1. **Unpublish from npm** (within 72 hours):
   ```bash
   npm unpublish @with-logic/fast-forward@0.1.12
   ```

2. **Delete the GitHub release**:
   ```bash
   gh release delete v0.1.12
   ```

3. **Delete the tag**:
   ```bash
   git tag -d v0.1.12
   git push origin :refs/tags/v0.1.12
   ```

**Note:** Unpublishing is discouraged by npm and should only be done in emergencies (security issues, critical bugs). Prefer publishing a new patch version with the fix.

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Developer runs: npm run prepare-release                │
│  - Creates release/v0.1.12 branch                       │
│  - Updates package.json, commits, tags                  │
│  - Opens PR with "release" label                        │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  Team reviews and merges PR to main                     │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  auto-release.yml workflow triggers (PR merge)          │
│  - Checks: merged + branch + title + label             │
│  - Reads version from package.json                      │
│  - Verifies git tag exists                              │
│  - Creates GitHub release                               │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│  publish.yml workflow triggers (release created)        │
│  - Validates version matches tag                        │
│  - Runs tests                                           │
│  - Builds package                                       │
│  - Publishes to npm registry                            │
│  - Publishes to GitHub Packages                         │
└─────────────────────────────────────────────────────────┘
```

## Questions or Issues?

If you encounter issues not covered here:

1. **Check workflow logs**: [GitHub Actions](https://github.com/with-logic/fast-forward/actions)
2. **Check npm**: [Package page](https://www.npmjs.com/package/@with-logic/fast-forward)
3. **Check releases**: [GitHub Releases](https://github.com/with-logic/fast-forward/releases)
4. **Contact maintainers**: Open an issue or reach out to the team

## References

- [Semantic Versioning](https://semver.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [npm Publishing](https://docs.npmjs.com/cli/publish)
- [GitHub CLI](https://cli.github.com/)
