#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    const result = execSync(command, { encoding: 'utf8', ...options });
    // Don't trim if stdio: 'inherit' is used (result will be Buffer/undefined)
    if (options.stdio === 'inherit') {
      return result;
    }
    return result.trim();
  } catch (error) {
    if (!options.ignoreError) {
      throw error;
    }
    return null;
  }
}

function getCurrentVersion() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return packageJson.version;
}

function getLatestPublishedVersion() {
  // Fetch latest tags from remote
  exec('git fetch --tags', { ignoreError: true });

  // Get the latest version tag
  const latestTag = exec('git tag --sort=-v:refname | head -1', { ignoreError: true });

  if (latestTag && latestTag.startsWith('v')) {
    return latestTag.substring(1); // Strip 'v' prefix
  }

  // Fallback to package.json version if no tags exist
  return getCurrentVersion();
}

function calculateNextVersion(current, bump) {
  const [major, minor, patch] = current.split('.').map(Number);
  switch (bump) {
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'major':
      return `${major + 1}.0.0`;
    default:
      throw new Error(`Unknown bump type: ${bump}`);
  }
}

function checkGitStatus() {
  const status = exec('git status --porcelain');
  if (status) {
    log('\n❌ Error: Working directory is not clean', 'red');
    log('Please commit or stash your changes before publishing.\n', 'dim');
    log('Uncommitted changes:', 'yellow');
    console.log(status);
    process.exit(1);
  }
}

function getCurrentBranch() {
  return exec('git rev-parse --abbrev-ref HEAD');
}

function requireMainBranch() {
  const branch = getCurrentBranch();
  if (branch !== 'main') {
    log('\n❌ Error: Must be on main branch to prepare a release', 'red');
    log(`\nCurrent branch: ${branch}`, 'dim');
    log('\nPlease switch to main first:', 'yellow');
    log('  git checkout main', 'dim');
    log('  git pull\n', 'dim');
    process.exit(1);
  }
}

function tagExists(tag) {
  const result = exec(`git tag -l "${tag}"`, { ignoreError: true });
  return result && result.trim() === tag;
}

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  log('\n📦 Fast-Forward - Release Preparation', 'bright');
  log('═'.repeat(50), 'dim');

  // Must be on main branch
  requireMainBranch();

  // Check git status
  checkGitStatus();

  log('\n✓ On main branch', 'green');
  log('✓ Working directory is clean', 'green');

  // Get latest published version from git tags
  const latestPublishedVersion = getLatestPublishedVersion();
  const packageJsonVersion = getCurrentVersion();

  // Show version info
  log(`\npackage.json version: ${packageJsonVersion}`, 'dim');
  log(`Latest published version: ${latestPublishedVersion}`, 'cyan');

  if (latestPublishedVersion !== packageJsonVersion) {
    log(`\n💡 Note: Will bump from latest published version (${latestPublishedVersion})`, 'yellow');
    log(`   package.json will be updated by npm version`, 'dim');
  }

  // Calculate next versions based on latest published version
  const currentVersion = latestPublishedVersion;

  // Show version options
  log('\nSelect version bump:', 'bright');
  log(`  1) patch  → ${calculateNextVersion(currentVersion, 'patch')} ${colors.dim}(bug fixes)${colors.reset}`);
  log(`  2) minor  → ${calculateNextVersion(currentVersion, 'minor')} ${colors.dim}(new features)${colors.reset}`);
  log(`  3) major  → ${calculateNextVersion(currentVersion, 'major')} ${colors.dim}(breaking changes)${colors.reset}`);

  const choice = await prompt('\nEnter your choice (1-3): ');

  const bumpMap = { '1': 'patch', '2': 'minor', '3': 'major' };
  const bumpType = bumpMap[choice.trim()];

  if (!bumpType) {
    log('\n❌ Invalid choice. Exiting.', 'red');
    process.exit(1);
  }

  const newVersion = calculateNextVersion(currentVersion, bumpType);
  const newTag = `v${newVersion}`;

  // Check if tag already exists
  if (tagExists(newTag)) {
    log(`\n❌ Error: Tag ${newTag} already exists`, 'red');
    log('\nTo fix this, either:', 'yellow');
    log(`  1. Delete the existing tag: git tag -d ${newTag}`, 'dim');
    log(`  2. Choose a different version bump`, 'dim');
    process.exit(1);
  }

  log(`\n📝 Preparing ${bumpType} release: ${currentVersion} → ${newVersion}`, 'yellow');

  const confirm = await prompt('\nContinue? (y/n): ');

  if (confirm.trim().toLowerCase() !== 'y') {
    log('\n❌ Cancelled.', 'red');
    process.exit(0);
  }

  const releaseBranch = `release/v${newVersion}`;

  log('\n⚙️  Creating release branch...', 'blue');
  try {
    exec(`git checkout -b ${releaseBranch}`);
    log(`✓ Created branch ${releaseBranch}`, 'green');
  } catch (error) {
    log('\n❌ Failed to create release branch', 'red');
    process.exit(1);
  }

  log('\n⚙️  Running npm version...', 'blue');
  try {
    exec(`npm version ${newVersion}`, { stdio: 'inherit' });
    log(`✓ Version bumped to ${newVersion}`, 'green');
  } catch (error) {
    log('\n❌ Failed to bump version', 'red');
    process.exit(1);
  }

  log('\n⚙️  Pushing to remote...', 'blue');
  try {
    exec(`git push -u origin ${releaseBranch} --follow-tags`, { stdio: 'inherit' });
    log('✓ Pushed release branch and tags', 'green');
  } catch (error) {
    log('\n❌ Failed to push. You may need to push manually:', 'red');
    log(`  git push -u origin ${releaseBranch} --follow-tags\n`, 'dim');
    process.exit(1);
  }

  log('\n⚙️  Creating pull request...', 'blue');
  try {
    const prUrl = exec(
      `gh pr create --base main --head ${releaseBranch} --title "Release v${newVersion}" --label "release" --body "Automated release PR for version ${newVersion}\n\n## Changes\n- Bump version from ${currentVersion} to ${newVersion}\n\n## Post-Merge: Fully Automated\n\nOnce this PR is merged, GitHub Actions will automatically:\n1. Create the GitHub release\n2. Publish to npm registry\n3. Publish to GitHub Packages\n\n**Monitor progress:** https://github.com/with-logic/fast-forward/actions\n\nNo manual steps required! 🎉"`
    );
    log(`✓ Pull request created`, 'green');
    console.log(prUrl);
  } catch (error) {
    log('\n⚠️  Failed to create PR automatically', 'yellow');
    log('\nYou can create it manually at:', 'dim');
    log(`  https://github.com/with-logic/fast-forward/compare/main...${releaseBranch}`, 'cyan');
    log(`  Don't forget to add the "release" label!\n`, 'dim');
  }

  log('\n' + '═'.repeat(50), 'dim');
  log('✅ Release PR created successfully!', 'green');
  log('\n📋 What happens next:', 'bright');
  log('  1. Review and merge the PR', 'cyan');
  log('  2. GitHub Actions will automatically:', 'dim');
  log('     • Create the GitHub release', 'dim');
  log('     • Publish to npm registry', 'dim');
  log('     • Publish to GitHub Packages', 'dim');
  log('\n📊 Monitor progress:', 'bright');
  log('  https://github.com/with-logic/fast-forward/actions', 'cyan');
  log('\n💡 Tip: You can switch back to main now:', 'dim');
  log('  git checkout main\n', 'dim');
}

main().catch((error) => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});
