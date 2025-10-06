/**
 * GitHookManager - Manages git pre-commit hooks for Lockor
 * 
 * Provides idempotent git pre-commit hook installation that:
 * - Installs hook when enabled in settings
 * - Hook runs on every commit but only blocks if locked files are staged
 * - No need to enable/disable hook based on locked file count
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const exec = promisify(require('child_process').exec);

export class GitHookManager {
    private workspaceFolder: vscode.WorkspaceFolder | undefined;
    private hookPath: string | undefined;

    constructor() {
        this.workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (this.workspaceFolder) {
            this.hookPath = path.join(this.workspaceFolder.uri.fsPath, '.git', 'hooks', 'pre-commit');
        }
    }

    /**
     * Check if git pre-commit hook is enabled in settings
     */
    private isHookEnabled(): boolean {
        const config = vscode.workspace.getConfiguration('lockor');
        return config.get<boolean>('gitPreCommitHook', true);
    }

    /**
     * Check if we're in a git repository
     */
    private async isGitRepository(): Promise<boolean> {
        if (!this.workspaceFolder) {
            return false;
        }

        try {
            await exec('git rev-parse --git-dir', { cwd: this.workspaceFolder.uri.fsPath });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get the current locked files list from Lockor
     */
    private async getLockedFiles(): Promise<string[]> {
        try {
            // Get locked files from Lockor command
            const result = await exec('lockor get-locked-files', { 
                cwd: this.workspaceFolder?.uri.fsPath 
            });
            return result.stdout.trim().split('\n').filter((f: string) => f.length > 0);
        } catch (error) {
            // If lockor command fails, return empty array
            return [];
        }
    }

    /**
     * Generate the pre-commit hook content
     */
    private generateHookContent(): string {
        return `#!/bin/sh
# Lockor Pre-Commit Hook
# This hook prevents commits containing changes to files locked by Lockor

# Get list of staged files
CHANGED_FILES=$(git diff --name-only --cached)

# If no files are staged, allow commit
if [ -z "$CHANGED_FILES" ]; then
    exit 0
fi

# Get list of locked files from Lockor
LOCKED_FILES=$(lockor get-locked-files 2>/dev/null || echo "")

# If no locked files, allow commit
if [ -z "$LOCKED_FILES" ]; then
    exit 0
fi

# Check if any staged files are locked
for file in $CHANGED_FILES; do
    if echo "$LOCKED_FILES" | grep -q "^$file$"; then
        echo "❌ COMMIT BLOCKED: File '$file' is locked by Lockor"
        echo "   This file was modified externally (possibly by AI bypassing protection)"
        echo "   Use 'lockor unlock $file' to allow changes, or 'git checkout HEAD -- $file' to revert"
        exit 1
    fi
done

# All checks passed, allow commit
exit 0
`;
    }

    /**
     * Install the pre-commit hook
     */
    public async installHook(): Promise<boolean> {
        if (!this.isHookEnabled()) {
            console.log('Lockor: Git pre-commit hook disabled in settings');
            return false;
        }

        if (!this.workspaceFolder || !this.hookPath) {
            console.log('Lockor: No workspace folder found');
            return false;
        }

        if (!(await this.isGitRepository())) {
            console.log('Lockor: Not in a git repository, skipping hook installation');
            return false;
        }

        try {
            // Ensure .git/hooks directory exists
            const hooksDir = path.dirname(this.hookPath);
            if (!fs.existsSync(hooksDir)) {
                fs.mkdirSync(hooksDir, { recursive: true });
            }

            // Write the hook file
            const hookContent = this.generateHookContent();
            fs.writeFileSync(this.hookPath, hookContent, 'utf8');
            
            // Make it executable
            fs.chmodSync(this.hookPath, 0o755);
            
            console.log('Lockor: Git pre-commit hook installed successfully');
            return true;
        } catch (error) {
            console.error('Lockor: Failed to install git pre-commit hook:', error);
            return false;
        }
    }

    /**
     * Remove the pre-commit hook
     */
    public async removeHook(): Promise<boolean> {
        if (!this.hookPath || !fs.existsSync(this.hookPath)) {
            return true; // Already removed
        }

        try {
            fs.unlinkSync(this.hookPath);
            console.log('Lockor: Git pre-commit hook removed successfully');
            return true;
        } catch (error) {
            console.error('Lockor: Failed to remove git pre-commit hook:', error);
            return false;
        }
    }

    /**
     * Check if the hook is currently installed
     */
    public isHookInstalled(): boolean {
        return this.hookPath ? fs.existsSync(this.hookPath) : false;
    }

    /**
     * Update the hook (reinstall with current settings)
     */
    public async updateHook(): Promise<boolean> {
        if (this.isHookEnabled()) {
            return await this.installHook();
        } else {
            return await this.removeHook();
        }
    }
}


