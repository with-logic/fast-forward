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

function updatePackageVersion(version) {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.version = version;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
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

  // Check git status
  checkGitStatus();

  // Show current branch
  const branch = getCurrentBranch();
  log(`\nCurrent branch: ${branch}`, 'cyan');

  // Get latest published version from git tags
  const latestPublishedVersion = getLatestPublishedVersion();
  const packageJsonVersion = getCurrentVersion();

  // Sync package.json with latest published version if needed
  if (latestPublishedVersion !== packageJsonVersion) {
    log(`\n⚠️  Version mismatch detected:`, 'yellow');
    log(`   package.json: ${packageJsonVersion}`, 'dim');
    log(`   Latest published: ${latestPublishedVersion}`, 'dim');
    log(`\n⚙️  Syncing package.json to latest published version...`, 'blue');
    updatePackageVersion(latestPublishedVersion);
    log(`✓ Updated package.json to ${latestPublishedVersion}`, 'green');
  }

  // Get current version (now synced with latest published)
  const currentVersion = getCurrentVersion();
  log(`\nCurrent version: ${currentVersion}`, 'cyan');

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

  log('\n⚙️  Running npm version...', 'blue');
  try {
    exec(`npm version ${bumpType}`, { stdio: 'inherit' });
    log(`✓ Version bumped to ${newVersion}`, 'green');
  } catch (error) {
    log('\n❌ Failed to bump version', 'red');
    process.exit(1);
  }

  log('\n⚙️  Pushing to remote...', 'blue');
  try {
    exec('git push --follow-tags', { stdio: 'inherit' });
    log('✓ Pushed commit and tags to remote', 'green');
  } catch (error) {
    log('\n❌ Failed to push. You may need to push manually:', 'red');
    log('  git push --follow-tags\n', 'dim');
    process.exit(1);
  }

  log('\n' + '═'.repeat(50), 'dim');
  log('✅ Version published successfully!', 'green');
  log('\n📋 Next step:', 'bright');
  log(`  Run: npm run release`, 'cyan');
  log('\n  This will create the GitHub release and trigger automated publishing.\n', 'dim');
}

main().catch((error) => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});
