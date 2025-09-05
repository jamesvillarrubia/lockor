/**
 * LockorManager - Core file locking functionality
 * 
 * Manages the state of locked files, persists them in workspace storage,
 * and provides methods to lock/unlock files.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class LockorManager {
    private static readonly LOCKED_FILES_KEY = 'lockor.lockedFiles';
    private lockedFiles: Set<string> = new Set();

    constructor(private context: vscode.ExtensionContext) {
        this.loadLockedFiles();
    }

    /**
     * Load locked files from workspace state
     */
    private loadLockedFiles(): void {
        const stored = this.context.workspaceState.get<string[]>(LockorManager.LOCKED_FILES_KEY, []);
        this.lockedFiles = new Set(stored);
        console.log(`Loaded ${this.lockedFiles.size} locked files from storage`);
    }

    /**
     * Save locked files to workspace state
     */
    private saveLockedFiles(): void {
        const filesArray = Array.from(this.lockedFiles);
        this.context.workspaceState.update(LockorManager.LOCKED_FILES_KEY, filesArray);
        console.log(`Saved ${filesArray.length} locked files to storage`);
    }

    /**
     * Convert URI to a consistent string key for storage
     */
    private uriToKey(uri: vscode.Uri): string {
        return uri.fsPath;
    }

    /**
     * Check if a file is locked
     */
    public isFileLocked(uri: vscode.Uri): boolean {
        const key = this.uriToKey(uri);
        const isLocked = this.lockedFiles.has(key);
        console.log(`Lockor: Checking if file is locked: ${key} -> ${isLocked}`);
        return isLocked;
    }

    /**
     * Lock a file
     */
    public async lockFile(uri: vscode.Uri): Promise<void> {
        const key = this.uriToKey(uri);
        const fileName = path.basename(uri.fsPath);

        if (this.lockedFiles.has(key)) {
            vscode.window.showInformationMessage(`File "${fileName}" is already locked`);
            return;
        }

        this.lockedFiles.add(key);
        this.saveLockedFiles();
        console.log(`Lockor: Locked file: ${key}. Total locked files: ${this.lockedFiles.size}`);

        // Apply protection based on configuration level
        const config = vscode.workspace.getConfiguration('lockor');
        const protectionLevel = config.get<string>('protectionLevel', 'ai-aware');
        const showNotifications = config.get<boolean>('showNotifications', true);
        
        if (protectionLevel === 'hard') {
            // OS-level read-only protection
            try {
                await this.setFileReadOnly(uri.fsPath, true);
                console.log(`Lockor: Set file read-only (hard protection): ${uri.fsPath}`);
            } catch (error) {
                console.warn(`Lockor: Could not set file read-only: ${error}`);
            }
        }

        if (showNotifications) {
            vscode.window.showInformationMessage(`🔒 File "${fileName}" is now locked`);
        }

        // Trigger status bar update
        this.onLockStateChanged(uri);
        
        // Update cursor rules
        await this.updateCursorRules();
    }

    /**
     * Unlock a file
     */
    public async unlockFile(uri: vscode.Uri): Promise<void> {
        const key = this.uriToKey(uri);
        const fileName = path.basename(uri.fsPath);

        if (!this.lockedFiles.has(key)) {
            vscode.window.showInformationMessage(`File "${fileName}" is not locked`);
            return;
        }

        this.lockedFiles.delete(key);
        this.saveLockedFiles();

        // Remove OS-level protection if it was applied
        const config = vscode.workspace.getConfiguration('lockor');
        const protectionLevel = config.get<string>('protectionLevel', 'ai-aware');
        const showNotifications = config.get<boolean>('showNotifications', true);
        
        if (protectionLevel === 'hard') {
            try {
                await this.setFileReadOnly(uri.fsPath, false);
                console.log(`Lockor: Removed read-only flag (hard protection): ${uri.fsPath}`);
            } catch (error) {
                console.warn(`Lockor: Could not remove read-only flag: ${error}`);
            }
        }

        if (showNotifications) {
            vscode.window.showInformationMessage(`🔓 File "${fileName}" is now unlocked`);
        }

        // Trigger status bar update
        this.onLockStateChanged(uri);
        
        // Update cursor rules
        await this.updateCursorRules();
    }

    /**
     * Toggle file lock state
     */
    public async toggleFileLock(uri: vscode.Uri): Promise<void> {
        if (this.isFileLocked(uri)) {
            await this.unlockFile(uri);
        } else {
            await this.lockFile(uri);
        }
    }

    /**
     * Set file read-only status at filesystem level
     */
    private async setFileReadOnly(filePath: string, readOnly: boolean): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    reject(err);
                    return;
                }

                let mode = stats.mode;
                if (readOnly) {
                    // Remove write permissions for owner, group, and others
                    mode = mode & ~(fs.constants.S_IWUSR | fs.constants.S_IWGRP | fs.constants.S_IWOTH);
                } else {
                    // Add write permission for owner
                    mode = mode | fs.constants.S_IWUSR;
                }

                fs.chmod(filePath, mode, (chmodErr) => {
                    if (chmodErr) {
                        reject(chmodErr);
                    } else {
                        resolve();
                    }
                });
            });
        });
    }

    /**
     * Show a list of all locked files
     */
    public async showLockedFiles(): Promise<void> {
        if (this.lockedFiles.size === 0) {
            vscode.window.showInformationMessage('No files are currently locked');
            return;
        }

        const items = Array.from(this.lockedFiles).map(filePath => {
            const fileName = path.basename(filePath);
            const relativePath = vscode.workspace.asRelativePath(filePath);
            
            return {
                label: `🔒 ${fileName}`,
                description: relativePath,
                filePath: filePath
            };
        });

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a locked file to unlock',
            canPickMany: false
        });

        if (selected) {
            const uri = vscode.Uri.file(selected.filePath);
            await this.unlockFile(uri);
        }
    }

    /**
     * Get all locked files
     */
    public getLockedFiles(): string[] {
        return Array.from(this.lockedFiles);
    }

    /**
     * Notify listeners that lock state changed
     */
    private onLockStateChanged(uri: vscode.Uri): void {
        // Trigger status bar refresh
        vscode.commands.executeCommand('lockor.internal.refreshStatusBar');
        // Update AI context
        vscode.commands.executeCommand('lockor.internal.updateAIContext');
    }

    /**
     * Update .cursor/rules with locked files
     */
    private async updateCursorRules(): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                console.warn('Lockor: No workspace folder found');
                return;
            }

            const cursorDir = vscode.Uri.joinPath(workspaceFolder.uri, '.cursor');
            const rulesFile = vscode.Uri.joinPath(cursorDir, 'rules');
            
            // Ensure .cursor directory exists
            try {
                await vscode.workspace.fs.createDirectory(cursorDir);
            } catch (error) {
                // Directory might already exist, that's fine
            }

            let existingRules = '';
            try {
                const existingContent = await vscode.workspace.fs.readFile(rulesFile);
                existingRules = Buffer.from(existingContent).toString('utf8');
            } catch (error) {
                // File doesn't exist yet, that's fine
            }

            // Remove existing Lockor rules
            const lockorStartMarker = '# === LOCKOR LOCKED FILES (AUTO-GENERATED) ===';
            const lockorEndMarker = '# === END LOCKOR LOCKED FILES ===';
            
            let cleanRules = existingRules;
            const startIndex = existingRules.indexOf(lockorStartMarker);
            const endIndex = existingRules.indexOf(lockorEndMarker);
            
            if (startIndex !== -1 && endIndex !== -1) {
                cleanRules = existingRules.substring(0, startIndex) + 
                           existingRules.substring(endIndex + lockorEndMarker.length);
            }

            // Generate new Lockor rules
            let lockorRules = '';
            if (this.lockedFiles.size > 0) {
                const config = vscode.workspace.getConfiguration('lockor');
                const protectionLevel = config.get<string>('protectionLevel', 'ai-aware');
                
                lockorRules = `\n${lockorStartMarker}\n`;
                lockorRules += `# Protection Level: ${protectionLevel}\n`;
                lockorRules += `# These files are locked by the Lockor extension and should NOT be modified.\n`;
                lockorRules += `# Treat them as immutable reference material.\n\n`;

                for (const filePath of this.lockedFiles) {
                    const relativePath = vscode.workspace.asRelativePath(filePath);
                    const fileName = path.basename(filePath);
                    lockorRules += `# LOCKED FILE: ${fileName}\n`;
                    lockorRules += `Do not suggest changes to "${relativePath}". This file is intentionally locked and should remain unchanged.\n\n`;
                }

                lockorRules += `${lockorEndMarker}\n`;
            }

            // Combine rules
            const finalRules = cleanRules.trim() + lockorRules;
            
            // Write back to file
            await vscode.workspace.fs.writeFile(rulesFile, Buffer.from(finalRules, 'utf8'));
            
            console.log(`Lockor: Updated .cursor/rules with ${this.lockedFiles.size} locked files`);
        } catch (error) {
            console.error('Lockor: Failed to update cursor rules:', error);
        }
    }
}
