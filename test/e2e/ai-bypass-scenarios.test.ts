/**
 * Manual test scenarios for Git Pre-Commit Hook
 * These tests simulate real-world usage scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'node:fs';
import * as path from 'node:path';

const execAsync = promisify(exec);

describe('Manual Test Scenarios', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    
    // Create unique test directory with timestamp
    const timestamp = Date.now();
    testDir = path.join(process.cwd(), `test-manual-scenarios-${timestamp}`);
    
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    
    fs.mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
    
    await execAsync('git init');
    await execAsync('git config user.email "test@example.com"');
    await execAsync('git config user.name "Test User"');
    
    // Create initial commit for clean state
    fs.writeFileSync('README.md', '# Test Repository');
    await execAsync('git add README.md');
    await execAsync('git commit -m "Initial commit"');
  });

  afterEach(async () => {
    try {
      process.chdir(originalCwd);
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors to prevent test failures
      console.warn('Cleanup warning:', error);
    }
  });

  describe('Scenario 1: Basic Hook Installation', () => {
    it('should install hook when files are locked', async () => {
      // Simulate Lockor locking files
      const lockedFiles = ['config.js', 'package.json'];
      
      // Create mock lockor command
      const mockLockorScript = `#!/bin/sh
if [ "$1" = "get-locked-files" ]; then
    echo "${lockedFiles.join('\n')}"
else
    echo "Usage: lockor get-locked-files"
    exit 1
fi
`;
      
      fs.writeFileSync('lockor', mockLockorScript);
      fs.chmodSync('lockor', 0o755);
      
      const originalPath = process.env.PATH;
      process.env.PATH = `${testDir}:${originalPath}`;
      
      // Install hook (simulating Lockor's behavior)
      const hookContent = `#!/bin/sh
# Lockor Pre-Commit Hook
CHANGED_FILES=$(git diff --name-only --cached)

if [ -z "$CHANGED_FILES" ]; then
    exit 0
fi

LOCKED_FILES=$(lockor get-locked-files 2>/dev/null || echo "")

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
      
      fs.writeFileSync('.git/hooks/pre-commit', hookContent);
      fs.chmodSync('.git/hooks/pre-commit', 0o755);
      
      // Verify hook is installed and executable
      expect(fs.existsSync('.git/hooks/pre-commit')).toBe(true);
      
      const stats = fs.statSync('.git/hooks/pre-commit');
      expect(stats.mode & 0o111).toBeGreaterThan(0); // Check if executable
      
      process.env.PATH = originalPath;
    });
  });

  describe('Scenario 2: Normal Development Workflow', () => {
    it('should allow normal commits of unlocked files', async () => {
      // Create hook that allows all commits (no locked files)
      const hookContent = `#!/bin/sh
# No locked files - allow all commits
exit 0
`;
      
      fs.writeFileSync('.git/hooks/pre-commit', hookContent);
      fs.chmodSync('.git/hooks/pre-commit', 0o755);
      
      // Create and commit normal files
      fs.mkdirSync('src', { recursive: true });
      fs.writeFileSync('src/index.js', 'console.log("Hello World");');
      fs.writeFileSync('README.md', '# Test Project');
      
      await execAsync('git add .');
      const { stdout } = await execAsync('git commit -m "Initial commit"');
      
      expect(stdout).toContain('Initial commit');
    });

    it('should allow commits of mixed locked/unlocked files when only unlocked files are staged', async () => {
      // Create mock lockor that returns some locked files
      const mockLockorScript = `#!/bin/sh
if [ "$1" = "get-locked-files" ]; then
    echo "config.js"
    echo "package.json"
else
    echo "Usage: lockor get-locked-files"
    exit 1
fi
`;
      
      fs.writeFileSync('lockor', mockLockorScript);
      fs.chmodSync('lockor', 0o755);
      
      const originalPath = process.env.PATH;
      process.env.PATH = `${testDir}:${originalPath}`;
      
      const hookContent = `#!/bin/sh
CHANGED_FILES=$(git diff --name-only --cached)

if [ -z "$CHANGED_FILES" ]; then
    exit 0
fi

LOCKED_FILES=$(lockor get-locked-files 2>/dev/null || echo "")

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
      
      fs.writeFileSync('.git/hooks/pre-commit', hookContent);
      fs.chmodSync('.git/hooks/pre-commit', 0o755);
      
      // Create files (some locked, some not)
      fs.mkdirSync('src', { recursive: true });
      fs.writeFileSync('config.js', 'module.exports = {};'); // This is locked
      fs.writeFileSync('src/app.js', 'console.log("app");'); // This is not locked
      fs.writeFileSync('README.md', '# Test'); // This is not locked
      
      // Only stage unlocked files
      await execAsync('git add src/app.js README.md');
      const { stdout } = await execAsync('git commit -m "Add unlocked files"');
      
      expect(stdout).toContain('Add unlocked files');
      
      process.env.PATH = originalPath;
    });
  });

  describe('Scenario 3: AI Bypass Detection', () => {
    it('should detect and block AI bypass attempts', async () => {
      const mockLockorScript = `#!/bin/sh
if [ "$1" = "get-locked-files" ]; then
    echo "config.js"
else
    echo "Usage: lockor get-locked-files"
    exit 1
fi
`;
      
      fs.writeFileSync('lockor', mockLockorScript);
      fs.chmodSync('lockor', 0o755);
      
      const originalPath = process.env.PATH;
      process.env.PATH = `${testDir}:${originalPath}`;
      
      const hookContent = `#!/bin/sh
CHANGED_FILES=$(git diff --name-only --cached)

if [ -z "$CHANGED_FILES" ]; then
    exit 0
fi

LOCKED_FILES=$(lockor get-locked-files 2>/dev/null || echo "")

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
      
      fs.writeFileSync('.git/hooks/pre-commit', hookContent);
      fs.chmodSync('.git/hooks/pre-commit', 0o755);
      
      // Simulate AI bypass scenario
      // 1. AI creates file
      fs.writeFileSync('config.js', 'module.exports = {};');
      
      // 2. AI bypasses protection with external tools
      // Simulate: chmod +w config.js && sed -i 's/old/new/g' config.js && chmod -w config.js
      fs.chmodSync('config.js', 0o666);
      fs.writeFileSync('config.js', 'module.exports = { bypassed: true };');
      fs.chmodSync('config.js', 0o444);
      
      // 3. AI tries to commit the changes
      await execAsync('git add config.js');
      
      // 4. Hook should block the commit
      try {
        await execAsync('git commit -m "AI bypass attempt"');
        expect.fail('Commit should have been blocked');
      } catch (error: any) {
        const output = error.stdout || error.stderr || '';
        expect(output).toContain('❌ COMMIT BLOCKED');
        expect(output).toContain('config.js');
        expect(output).toContain('modified externally');
        expect(output).toContain('AI bypassing protection');
      }
      
      process.env.PATH = originalPath;
    });
  });

  describe('Scenario 4: Configuration Changes', () => {
    it('should handle hook enable/disable', async () => {
      // Test with hook enabled
      const hookContent = `#!/bin/sh
CHANGED_FILES=$(git diff --name-only --cached)

if [ -z "$CHANGED_FILES" ]; then
    exit 0
fi

LOCKED_FILES=$(lockor get-locked-files 2>/dev/null || echo "")

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
      
      fs.writeFileSync('.git/hooks/pre-commit', hookContent);
      fs.chmodSync('.git/hooks/pre-commit', 0o755);
      
      // Test with hook disabled (remove hook)
      fs.unlinkSync('.git/hooks/pre-commit');
      
      // Should be able to commit anything now
      fs.writeFileSync('config.js', 'module.exports = {};');
      await execAsync('git add config.js');
      const { stdout } = await execAsync('git commit -m "Commit with disabled hook"');
      
      expect(stdout).toContain('Commit with disabled hook');
    });
  });

  describe('Scenario 5: Error Handling', () => {
    it('should handle missing lockor command gracefully', async () => {
      const hookContent = `#!/bin/sh
CHANGED_FILES=$(git diff --name-only --cached)

if [ -z "$CHANGED_FILES" ]; then
    exit 0
fi

# Try to get locked files, but handle failure gracefully
LOCKED_FILES=$(lockor get-locked-files 2>/dev/null || echo "")

if [ -z "$LOCKED_FILES" ]; then
    # No locked files or lockor command failed - allow commit
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
      
      fs.writeFileSync('.git/hooks/pre-commit', hookContent);
      fs.chmodSync('.git/hooks/pre-commit', 0o755);
      
      // Should work even without lockor command
      fs.writeFileSync('config.js', 'module.exports = {};');
      await execAsync('git add config.js');
      const { stdout } = await execAsync('git commit -m "Commit without lockor"');
      
      expect(stdout).toContain('Commit without lockor');
    });

    it('should provide clear error messages', async () => {
      const mockLockorScript = `#!/bin/sh
if [ "$1" = "get-locked-files" ]; then
    echo "config.js"
else
    echo "Usage: lockor get-locked-files"
    exit 1
fi
`;
      
      fs.writeFileSync('lockor', mockLockorScript);
      fs.chmodSync('lockor', 0o755);
      
      const originalPath = process.env.PATH;
      process.env.PATH = `${testDir}:${originalPath}`;
      
      const hookContent = `#!/bin/sh
CHANGED_FILES=$(git diff --name-only --cached)

if [ -z "$CHANGED_FILES" ]; then
    exit 0
fi

LOCKED_FILES=$(lockor get-locked-files 2>/dev/null || echo "")

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
      
      fs.writeFileSync('.git/hooks/pre-commit', hookContent);
      fs.chmodSync('.git/hooks/pre-commit', 0o755);
      
      fs.writeFileSync('config.js', 'module.exports = {};');
      await execAsync('git add config.js');
      
      try {
        await execAsync('git commit -m "Test commit"');
        expect.fail('Commit should have been blocked');
      } catch (error: any) {
        // Verify error message contains helpful information
        const output = error.stdout || error.stderr || '';
        expect(output).toContain('❌ COMMIT BLOCKED');
        expect(output).toContain('config.js');
        expect(output).toContain('locked by Lockor');
        expect(output).toContain('modified externally');
        expect(output).toContain('lockor unlock');
        expect(output).toContain('git checkout HEAD');
      }
      
      process.env.PATH = originalPath;
    });
  });
});
