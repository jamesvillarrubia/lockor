/**
 * Integration tests for Git Pre-Commit Hook functionality
 * Tests the actual git hook behavior in a simulated environment
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdirSync, writeFileSync, rmSync, existsSync, chmodSync } from 'node:fs';
import { join, dirname } from 'node:path';

const execAsync = promisify(exec);

describe('Git Hook Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Save original working directory
    originalCwd = process.cwd();
    
    // Create unique test directory with timestamp to avoid conflicts
    const timestamp = Date.now();
    testDir = join(process.cwd(), `test-temp-git-repo-${timestamp}`);
    
    // Clean up any existing test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    
    // Create test directory and initialize git
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
    
    // Initialize git repository
    await execAsync('git init');
    await execAsync('git config user.email "test@example.com"');
    await execAsync('git config user.name "Test User"');
    
    // Create initial commit to have a clean state
    writeFileSync('README.md', '# Test Repository');
    await execAsync('git add README.md');
    await execAsync('git commit -m "Initial commit"');
  });

  afterEach(async () => {
    try {
      // Restore original working directory first
      process.chdir(originalCwd);
      
      // Clean up test directory
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors to prevent test failures
      console.warn('Cleanup warning:', error);
    }
  });

  describe('Git Hook Installation', () => {
    it('should install pre-commit hook when enabled', async () => {
      // Create mock locked files list
      const lockedFiles = ['config.js', 'package.json'];
      
      // Create mock lockor command that returns locked files
      const mockLockorScript = `#!/bin/sh
if [ "$1" = "get-locked-files" ]; then
    echo "${lockedFiles.join('\n')}"
else
    echo "Usage: lockor get-locked-files"
    exit 1
fi
`;
      
writeFileSync('lockor', mockLockorScript);
chmodSync('lockor', 0o755);
      
      // Add lockor to PATH for this test
      const originalPath = process.env.PATH;
      process.env.PATH = `${testDir}:${originalPath}`;
      
      // Create the hook content
      const hookContent = `#!/bin/sh
# Lockor Pre-Commit Hook
CHANGED_FILES=$(git diff --name-only --cached)

if [ -z "$CHANGED_FILES" ]; then
    exit 0
fi

LOCKED_FILES=$(lockor 2>/dev/null || echo "")

if [ -z "$LOCKED_FILES" ]; then
    exit 0
fi

for file in $CHANGED_FILES; do
    if echo "$LOCKED_FILES" | grep -q "^$file$"; then
        echo "❌ COMMIT BLOCKED: File '$file' is locked by Lockor"
        exit 1
    fi
done

exit 0
`;
      
      // Install the hook
writeFileSync('.git/hooks/pre-commit', hookContent);
chmodSync('.git/hooks/pre-commit', 0o755);
      
      expect(existsSync('.git/hooks/pre-commit')).toBe(true);
      
      // Restore PATH
      process.env.PATH = originalPath;
    });

    it('should allow commits of non-locked files', async () => {
      // Create test file
writeFileSync('allowed-file.js', 'console.log("allowed");');
      
      // Stage and commit
      await execAsync('git add allowed-file.js');
      
      // This should succeed
      const { stdout } = await execAsync('git commit -m "Add allowed file"');
      expect(stdout).toContain('Add allowed file');
      
      // Verify the file was committed
      const { stdout: logOutput } = await execAsync('git log --oneline -1');
      expect(logOutput).toContain('Add allowed file');
    });

    it('should block commits of locked files', async () => {
      // Create mock lockor command
      const mockLockorScript = `#!/bin/sh
echo "config.js"
echo "package.json"
`;
      
writeFileSync('lockor', mockLockorScript);
chmodSync('lockor', 0o755);
      
      // Add lockor to PATH
      const originalPath = process.env.PATH;
      process.env.PATH = `${testDir}:${originalPath}`;
      
      // Create hook
      const hookContent = `#!/bin/sh
CHANGED_FILES=$(git diff --name-only --cached)

if [ -z "$CHANGED_FILES" ]; then
    exit 0
fi

LOCKED_FILES=$(lockor 2>/dev/null || echo "")

if [ -z "$LOCKED_FILES" ]; then
    exit 0
fi

for file in $CHANGED_FILES; do
    if echo "$LOCKED_FILES" | grep -q "^$file$"; then
        echo "❌ COMMIT BLOCKED: File '$file' is locked by Lockor"
        exit 1
    fi
done

exit 0
`;
      
writeFileSync('.git/hooks/pre-commit', hookContent);
chmodSync('.git/hooks/pre-commit', 0o755);
      
      // Create and stage a locked file
writeFileSync('config.js', 'module.exports = {};');
      await execAsync('git add config.js');
      
      // This should fail
      try {
        await execAsync('git commit -m "Add locked file"');
        expect.fail('Commit should have been blocked');
      } catch (error: any) {
        const output = error.stdout || error.stderr || '';
        expect(output).toContain('❌ COMMIT BLOCKED');
        expect(output).toContain('config.js');
      }
      
      // Verify the commit was not created
      const { stdout: logOutput } = await execAsync('git log --oneline');
      expect(logOutput).not.toContain('Test commit');
      
      // Restore PATH
      process.env.PATH = originalPath;
    });

    it('should handle AI bypass simulation', async () => {
      // Create mock lockor command
      const mockLockorScript = `#!/bin/sh
echo "config.js"
`;
      
writeFileSync('lockor', mockLockorScript);
chmodSync('lockor', 0o755);
      
      // Add lockor to PATH
      const originalPath = process.env.PATH;
      process.env.PATH = `${testDir}:${originalPath}`;
      
      // Create hook
      const hookContent = `#!/bin/sh
CHANGED_FILES=$(git diff --name-only --cached)

if [ -z "$CHANGED_FILES" ]; then
    exit 0
fi

LOCKED_FILES=$(lockor 2>/dev/null || echo "")

if [ -z "$LOCKED_FILES" ]; then
    exit 0
fi

for file in $CHANGED_FILES; do
    if echo "$LOCKED_FILES" | grep -q "^$file$"; then
        echo "❌ COMMIT BLOCKED: File '$file' is locked by Lockor"
        echo "   This file was modified externally (possibly by AI bypassing protection)"
        exit 1
    fi
done

exit 0
`;
      
writeFileSync('.git/hooks/pre-commit', hookContent);
chmodSync('.git/hooks/pre-commit', 0o755);
      
      // Simulate AI bypass: create file, modify with external tools
writeFileSync('config.js', 'module.exports = {};');
      
      // Simulate chmod + sed bypass
chmodSync('config.js', 0o666); // Make writable
writeFileSync('config.js', 'module.exports = { modified: true };'); // Modify content
chmodSync('config.js', 0o444); // Make read-only again
      
      await execAsync('git add config.js');
      
      // This should fail even though AI bypassed the protection
      try {
        await execAsync('git commit -m "AI bypass attempt"');
        expect.fail('Commit should have been blocked despite AI bypass');
      } catch (error: any) {
        const output = error.stdout || error.stderr || '';
        expect(output).toContain('❌ COMMIT BLOCKED');
        expect(output).toContain('config.js');
        expect(output).toContain('modified externally');
      }
      
      // Restore PATH
      process.env.PATH = originalPath;
    });

    it('should allow commits after unlocking files', async () => {
      // Create mock lockor command that returns empty list (no locked files)
      const mockLockorScript = `#!/bin/sh
# No locked files
`;
      
writeFileSync('lockor', mockLockorScript);
chmodSync('lockor', 0o755);
      
      // Add lockor to PATH
      const originalPath = process.env.PATH;
      process.env.PATH = `${testDir}:${originalPath}`;
      
      // Create hook
      const hookContent = `#!/bin/sh
CHANGED_FILES=$(git diff --name-only --cached)

if [ -z "$CHANGED_FILES" ]; then
    exit 0
fi

LOCKED_FILES=$(lockor 2>/dev/null || echo "")

if [ -z "$LOCKED_FILES" ]; then
    exit 0
fi

for file in $CHANGED_FILES; do
    if echo "$LOCKED_FILES" | grep -q "^$file$"; then
        echo "❌ COMMIT BLOCKED: File '$file' is locked by Lockor"
        exit 1
    fi
done

exit 0
`;
      
writeFileSync('.git/hooks/pre-commit', hookContent);
chmodSync('.git/hooks/pre-commit', 0o755);
      
      // Create and stage a file (now unlocked)
writeFileSync('config.js', 'module.exports = { unlocked: true };');
      await execAsync('git add config.js');
      
      // This should succeed now
      const { stdout } = await execAsync('git commit -m "Add unlocked file"');
      expect(stdout).toContain('Add unlocked file');
      
      // Restore PATH
      process.env.PATH = originalPath;
    });

    it('should handle multiple locked files', async () => {
      // Create mock lockor command with multiple locked files
      const mockLockorScript = `#!/bin/sh
echo "config.js"
echo "package.json"
echo "src/app.js"
`;
      
writeFileSync('lockor', mockLockorScript);
chmodSync('lockor', 0o755);
      
      // Add lockor to PATH
      const originalPath = process.env.PATH;
      process.env.PATH = `${testDir}:${originalPath}`;
      
      // Create hook
      const hookContent = `#!/bin/sh
CHANGED_FILES=$(git diff --name-only --cached)

if [ -z "$CHANGED_FILES" ]; then
    exit 0
fi

LOCKED_FILES=$(lockor 2>/dev/null || echo "")

if [ -z "$LOCKED_FILES" ]; then
    exit 0
fi

for file in $CHANGED_FILES; do
    if echo "$LOCKED_FILES" | grep -q "^$file$"; then
        echo "❌ COMMIT BLOCKED: File '$file' is locked by Lockor"
        exit 1
    fi
done

exit 0
`;
      
writeFileSync('.git/hooks/pre-commit', hookContent);
chmodSync('.git/hooks/pre-commit', 0o755);
      
      // Create and stage multiple locked files
      mkdirSync('src', { recursive: true });
      writeFileSync('config.js', 'module.exports = {};');
      writeFileSync('package.json', '{"name": "test"}');
      writeFileSync('src/app.js', 'console.log("app");');
      
      await execAsync('git add .');
      
      // This should fail
      try {
        await execAsync('git commit -m "Add multiple locked files"');
        expect.fail('Commit should have been blocked');
      } catch (error: any) {
        const output = error.stdout || error.stderr || '';
        expect(output).toContain('❌ COMMIT BLOCKED');
        // Should mention at least one of the locked files
        expect(
          output.includes('config.js') || 
          output.includes('package.json') || 
          output.includes('src/app.js')
        ).toBe(true);
      }
      
      // Restore PATH
      process.env.PATH = originalPath;
    });
  });

  describe('Hook Error Messages', () => {
    it('should provide helpful error messages', async () => {
      // Create mock lockor command
      const mockLockorScript = `#!/bin/sh
echo "config.js"
`;
      
writeFileSync('lockor', mockLockorScript);
chmodSync('lockor', 0o755);
      
      // Add lockor to PATH
      const originalPath = process.env.PATH;
      process.env.PATH = `${testDir}:${originalPath}`;
      
      // Create hook with detailed error messages
      const hookContent = `#!/bin/sh
CHANGED_FILES=$(git diff --name-only --cached)

if [ -z "$CHANGED_FILES" ]; then
    exit 0
fi

LOCKED_FILES=$(lockor 2>/dev/null || echo "")

if [ -z "$LOCKED_FILES" ]; then
    exit 0
fi

for file in $CHANGED_FILES; do
    if echo "$LOCKED_FILES" | grep -q "^$file$"; then
        echo "❌ COMMIT BLOCKED: File '$file' is locked by Lockor"
        echo "   This file was modified externally (possibly by AI bypassing protection)"
        echo "   Use 'lockor unlock $file' to allow changes, or 'git checkout HEAD -- $file' to revert"
        exit 1
    fi
done

exit 0
`;
      
writeFileSync('.git/hooks/pre-commit', hookContent);
chmodSync('.git/hooks/pre-commit', 0o755);
      
      // Create and stage a locked file
writeFileSync('config.js', 'module.exports = {};');
      await execAsync('git add config.js');
      
      // This should fail with helpful message
      try {
        await execAsync('git commit -m "Test commit"');
        expect.fail('Commit should have been blocked');
      } catch (error: any) {
        const output = error.stdout || error.stderr || '';
        expect(output).toContain('❌ COMMIT BLOCKED');
        expect(output).toContain('config.js');
        expect(output).toContain('modified externally');
        expect(output).toContain('lockor unlock');
        expect(output).toContain('git checkout HEAD');
      }
      
      // Restore PATH
      process.env.PATH = originalPath;
    });
  });
});
