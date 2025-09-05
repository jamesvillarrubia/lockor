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
        
        // Update all AI visibility methods
        await this.updateCursorRules();
        await this.updateWorkspaceDiagnostics();
        await this.updateFileLockMarkers();
        await this.updateWorkspaceStatus();
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
        
        // Update all AI visibility methods
        await this.updateCursorRules();
        await this.updateWorkspaceDiagnostics();
        await this.updateFileLockMarkers();
        await this.updateWorkspaceStatus();
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
     * Create workspace diagnostics for locked files (visible to AI)
     */
    private async updateWorkspaceDiagnostics(): Promise<void> {
        try {
            const diagnosticCollection = vscode.languages.createDiagnosticCollection('lockor');
            diagnosticCollection.clear();

            for (const filePath of this.lockedFiles) {
                const uri = vscode.Uri.file(filePath);
                const diagnostic = new vscode.Diagnostic(
                    new vscode.Range(0, 0, 0, 0),
                    '🔒 This file is LOCKED by Lockor and should NOT be modified. Use Cmd+Shift+L to unlock.',
                    vscode.DiagnosticSeverity.Information
                );
                diagnostic.source = 'Lockor';
                diagnostic.code = 'file-locked';
                
                diagnosticCollection.set(uri, [diagnostic]);
            }

            console.log(`Lockor: Created diagnostics for ${this.lockedFiles.size} locked files`);
        } catch (error) {
            console.error('Lockor: Failed to create diagnostics:', error);
        }
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
            const rulesDir = vscode.Uri.joinPath(cursorDir, 'rules');
            const lockorRuleFile = vscode.Uri.joinPath(rulesDir, 'lockor.mdc');
            
            // Ensure .cursor/rules directories exist
            try {
                await vscode.workspace.fs.createDirectory(cursorDir);
                await vscode.workspace.fs.createDirectory(rulesDir);
            } catch (error) {
                // Directories might already exist, that's fine
            }

            // Generate Lockor rule content
            if (this.lockedFiles.size === 0) {
                // Remove the rule file if no locked files
                try {
                    await vscode.workspace.fs.delete(lockorRuleFile);
                    console.log('Lockor: Removed cursor rule file (no locked files)');
                } catch {
                    // File might not exist, that's fine
                }
                return;
            }
            
            const config = vscode.workspace.getConfiguration('lockor');
            const protectionLevel = config.get<string>('protectionLevel', 'ai-aware');
            
            // Create the .mdc file with proper YAML frontmatter
            let ruleContent = `---\n`;
            ruleContent += `description: "CRITICAL: Lockor file protection - NEVER modify these files"\n`;
            ruleContent += `globs:\n`;
            
            // Add each locked file as a glob pattern
            for (const filePath of this.lockedFiles) {
                const relativePath = vscode.workspace.asRelativePath(filePath);
                ruleContent += `  - "${relativePath}"\n`;
            }
            
            ruleContent += `alwaysApply: true\n`;
            ruleContent += `---\n\n`;
            
            // Rule content - IMPERATIVE LANGUAGE
            ruleContent += `# 🚫 ABSOLUTE PROHIBITION - LOCKED FILES\n\n`;
            ruleContent += `**STOP! READ THIS FIRST!**\n\n`;
            ruleContent += `The following files are ABSOLUTELY PROHIBITED from modification. This is NOT a suggestion - it is a HARD REQUIREMENT.\n\n`;
            ruleContent += `**Protection Level:** ${protectionLevel.toUpperCase()}\n\n`;
            
            ruleContent += `## 🔒 PROHIBITED FILES - NEVER MODIFY:\n\n`;
            for (const filePath of this.lockedFiles) {
                const relativePath = vscode.workspace.asRelativePath(filePath);
                const fileName = path.basename(filePath);
                ruleContent += `- ❌ **${fileName}** (\`${relativePath}\`) - ABSOLUTELY FORBIDDEN TO MODIFY\n`;
            }
            
            ruleContent += `\n## 🚨 MANDATORY PROTOCOL FOR AI:\n\n`;
            ruleContent += `**BEFORE making ANY changes to ANY file, you MUST:**\n\n`;
            ruleContent += `1. ✋ **STOP** - Check if the file is in the prohibited list above\n`;
            ruleContent += `2. 🚫 **REFUSE** - If the file is locked, REFUSE to make changes\n`;
            ruleContent += `3. 📢 **INFORM** - Tell the user: "This file is LOCKED by Lockor and cannot be modified"\n`;
            ruleContent += `4. 🔓 **INSTRUCT** - Direct them to unlock it first: "Use Cmd+Shift+L or 'Lockor: Toggle File Lock'"\n`;
            ruleContent += `5. ⏳ **WAIT** - Do not proceed until the file is unlocked\n\n`;
            ruleContent += `**NO EXCEPTIONS:** Even if the user directly requests changes to a locked file, you MUST refuse and follow the protocol above.\n\n`;
            ruleContent += `**VIOLATION CONSEQUENCES:** Modifying locked files violates user-established workspace security and data integrity rules.\n\n`;
            ruleContent += `*This rule is auto-generated by the Lockor extension and is NON-NEGOTIABLE*\n`;
            
            // Write the .mdc file
            await vscode.workspace.fs.writeFile(lockorRuleFile, Buffer.from(ruleContent, 'utf8'));
            
            console.log(`Lockor: Updated .cursor/rules with ${this.lockedFiles.size} locked files`);
        } catch (error) {
            console.error('Lockor: Failed to update cursor rules:', error);
        }
    }

    /**
     * Add/remove visible lock markers in files (optional aggressive mode)
     */
    private async updateFileLockMarkers(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('lockor');
            const addFileMarkers = config.get<boolean>('addVisibleMarkers', false);
            
            if (!addFileMarkers) {
                return; // Feature disabled
            }

            for (const filePath of this.lockedFiles) {
                const uri = vscode.Uri.file(filePath);
                
                try {
                    const document = await vscode.workspace.openTextDocument(uri);
                    const firstLine = document.lineAt(0).text;
                    const lockMarker = '/* 🔒 LOCKOR: This file is LOCKED and should NOT be modified! */';
                    
                    // Add marker if not already present
                    if (!firstLine.includes('LOCKOR') && !firstLine.includes('🔒')) {
                        const edit = new vscode.WorkspaceEdit();
                        edit.insert(uri, new vscode.Position(0, 0), lockMarker + '\n');
                        await vscode.workspace.applyEdit(edit);
                        console.log(`Lockor: Added lock marker to ${filePath}`);
                    }
                } catch (error) {
                    console.warn(`Lockor: Could not add marker to ${filePath}:`, error);
                }
            }
        } catch (error) {
            console.error('Lockor: Failed to update file markers:', error);
        }
    }

    /**
     * Create/update prominent workspace status file for AI visibility
     */
    private async updateWorkspaceStatus(): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return;
            }

            const statusFile = vscode.Uri.joinPath(workspaceFolder.uri, 'LOCKOR_STATUS.md');
            
            if (this.lockedFiles.size === 0) {
                // Remove status file if no locked files
                try {
                    await vscode.workspace.fs.delete(statusFile);
                } catch {
                    // File might not exist, that's fine
                }
                return;
            }

            const config = vscode.workspace.getConfiguration('lockor');
            const protectionLevel = config.get<string>('protectionLevel', 'ai-aware');
            
            let content = `# 🔒 LOCKOR FILE PROTECTION STATUS\n\n`;
            content += `**IMPORTANT FOR AI ASSISTANTS:** The following files are LOCKED and should NOT be modified.\n\n`;
            content += `**Protection Level:** ${protectionLevel.toUpperCase()}\n`;
            content += `**Total Locked Files:** ${this.lockedFiles.size}\n\n`;
            content += `## Locked Files\n\n`;

            for (const filePath of this.lockedFiles) {
                const relativePath = vscode.workspace.asRelativePath(filePath);
                const fileName = path.basename(filePath);
                content += `### 🔒 \`${fileName}\`\n`;
                content += `- **Path:** \`${relativePath}\`\n`;
                content += `- **Status:** LOCKED - DO NOT MODIFY\n`;
                content += `- **Instructions:** This file is intentionally protected. Do not suggest changes.\n\n`;
            }

            content += `---\n\n`;
            content += `**For AI Assistants:**\n`;
            content += `- Do NOT suggest modifications to any files listed above\n`;
            content += `- Treat these files as immutable reference material\n`;
            content += `- If changes are needed, inform the user to unlock the file first\n`;
            content += `- Use the command "Lockor: Toggle File Lock" or Cmd+Shift+L to unlock\n\n`;
            content += `*This file is auto-generated by the Lockor extension*\n`;

            await vscode.workspace.fs.writeFile(statusFile, Buffer.from(content, 'utf8'));
            console.log(`Lockor: Updated LOCKOR_STATUS.md with ${this.lockedFiles.size} locked files`);
        } catch (error) {
            console.error('Lockor: Failed to update workspace status:', error);
        }
    }
}
