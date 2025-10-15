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

function checkGhCli() {
  const result = exec('which gh', { ignoreError: true });
  if (!result) {
    log('\n❌ Error: GitHub CLI (gh) is not installed', 'red');
    log('\nPlease install it first:', 'yellow');
    log('  brew install gh', 'dim');
    log('  # or visit: https://cli.github.com/', 'dim');
    log('\nThen authenticate with:', 'yellow');
    log('  gh auth login\n', 'dim');
    process.exit(1);
  }
}

function tagExists(tag) {
  const result = exec(`git tag -l "${tag}"`, { ignoreError: true });
  return result && result.trim() === tag;
}

function tagExistsOnRemote(tag) {
  const result = exec(`git ls-remote --tags origin ${tag}`, { ignoreError: true });
  return result && result.includes(tag);
}

function releaseExists(tag) {
  const result = exec(`gh release view ${tag}`, { ignoreError: true });
  return result !== null;
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
  log('\n🚀 Fast-Forward Release Creator', 'bright');
  log('═'.repeat(50), 'dim');

  // Check for gh CLI
  checkGhCli();

  // Get current version
  const currentVersion = getCurrentVersion();
  const tag = `v${currentVersion}`;

  log(`\nCurrent version: ${currentVersion}`, 'cyan');
  log(`Release tag: ${tag}`, 'cyan');

  // Check if tag exists locally
  if (!tagExists(tag)) {
    log(`\n❌ Error: Tag ${tag} does not exist locally`, 'red');
    log('\nPlease run the prepare-release script first:', 'yellow');
    log('  npm run prepare-release\n', 'dim');
    process.exit(1);
  }
  log(`✓ Tag ${tag} exists locally`, 'green');

  // Check if tag exists on remote
  if (!tagExistsOnRemote(tag)) {
    log(`\n❌ Error: Tag ${tag} has not been pushed to remote`, 'red');
    log('\nPlease push the tag first:', 'yellow');
    log('  git push --follow-tags\n', 'dim');
    log('Or run the prepare-release script:', 'yellow');
    log('  npm run prepare-release\n', 'dim');
    process.exit(1);
  }
  log(`✓ Tag ${tag} exists on remote`, 'green');

  // Check if release already exists
  if (releaseExists(tag)) {
    log(`\n❌ Error: Release ${tag} already exists`, 'red');
    log(`\nView it at: https://github.com/with-logic/fast-forward/releases/tag/${tag}\n`, 'dim');
    process.exit(1);
  }
  log(`✓ No existing release for ${tag}`, 'green');

  // Prompt for release notes option
  log('\n📝 Release notes options:', 'bright');
  log('  1) Auto-generate from commits (recommended)', 'dim');
  log('  2) Provide custom release notes', 'dim');
  log('  3) Open in editor', 'dim');

  const choice = await prompt('\nEnter your choice (1-3): ');

  let releaseCommand = `gh release create ${tag}`;

  if (choice.trim() === '1' || choice.trim() === '') {
    releaseCommand += ' --generate-notes';
    log('\n📝 Will auto-generate release notes from commits', 'yellow');
  } else if (choice.trim() === '2') {
    const notes = await prompt('\nEnter release notes (one line): ');
    if (notes.trim()) {
      releaseCommand += ` --notes "${notes.trim()}"`;
    } else {
      releaseCommand += ' --generate-notes';
      log('No notes provided, will auto-generate', 'dim');
    }
  } else if (choice.trim() === '3') {
    releaseCommand += ' --notes-file -';
    log('\n📝 Will open editor for release notes', 'yellow');
  } else {
    log('\n❌ Invalid choice. Using auto-generated notes.', 'yellow');
    releaseCommand += ' --generate-notes';
  }

  const confirm = await prompt('\nCreate release? (y/n): ');

  if (confirm.trim().toLowerCase() !== 'y') {
    log('\n❌ Cancelled.', 'red');
    process.exit(0);
  }

  log('\n⚙️  Creating GitHub release...', 'blue');
  try {
    if (choice.trim() === '3') {
      // For editor mode, we need to use interactive mode
      exec(releaseCommand, { stdio: 'inherit' });
    } else {
      const result = exec(releaseCommand);
      log(`✓ Release created successfully`, 'green');
      console.log(result);
    }
  } catch (error) {
    log('\n❌ Failed to create release', 'red');
    log('\nYou can create it manually at:', 'yellow');
    log(`  https://github.com/with-logic/fast-forward/releases/new?tag=${tag}\n`, 'dim');
    process.exit(1);
  }

  log('\n' + '═'.repeat(50), 'dim');
  log('✅ Release created successfully!', 'green');
  log('\n📋 What happens next:', 'bright');
  log('  • GitHub Actions will run tests and build', 'dim');
  log('  • Package will be published to npmjs.org (public)', 'dim');
  log('  • Package will be published to GitHub Packages (private)', 'dim');
  log('  • Users can install with: npm install @with-logic/fast-forward', 'dim');
  log('\n📊 Monitor progress at:', 'bright');
  log('  https://github.com/with-logic/fast-forward/actions\n', 'cyan');
}

main().catch((error) => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});
