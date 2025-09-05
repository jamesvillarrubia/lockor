/**
 * Lockor Extension - Main entry point
 * 
 * This extension prevents Cursor/VS Code from modifying certain files by:
 * - Tracking locked files in workspace state
 * - Intercepting save operations on locked files
 * - Providing commands to lock/unlock files
 * - Showing visual indicators for locked files
 */

import * as vscode from 'vscode';
import { LockorManager } from './lockor-manager';
import { StatusBarManager } from './status-bar-manager';

let lockorManager: LockorManager;
let statusBarManager: StatusBarManager;

// Debouncing for document change notifications
const notificationDebounce = new Map<string, NodeJS.Timeout>();

/**
 * Extension activation - called when VS Code loads the extension
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Lockor extension is now active');

    // Initialize managers
    lockorManager = new LockorManager(context);
    statusBarManager = new StatusBarManager(lockorManager);

    // Register commands
    const commands = [
        vscode.commands.registerCommand('lockor.lockFile', async () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                await lockorManager.lockFile(activeEditor.document.uri);
            } else {
                vscode.window.showWarningMessage('No active file to lock');
            }
        }),

        vscode.commands.registerCommand('lockor.unlockFile', async () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                await lockorManager.unlockFile(activeEditor.document.uri);
            } else {
                vscode.window.showWarningMessage('No active file to unlock');
            }
        }),

        vscode.commands.registerCommand('lockor.toggleLock', async (uri?: vscode.Uri) => {
            // If called from context menu, uri will be provided
            // If called from command palette, use active editor
            const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
            
            if (targetUri) {
                await lockorManager.toggleFileLock(targetUri);
            } else {
                vscode.window.showWarningMessage('No file selected to toggle lock');
            }
        }),

        vscode.commands.registerCommand('lockor.showLockedFiles', () => {
            lockorManager.showLockedFiles();
        }),

        // API for AI tools to query lock status
        vscode.commands.registerCommand('lockor.isFileLocked', (uri?: vscode.Uri) => {
            const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
            if (targetUri) {
                return lockorManager.isFileLocked(targetUri);
            }
            return false;
        }),

        // API for AI tools to get all locked files
        vscode.commands.registerCommand('lockor.getLockedFiles', () => {
            return lockorManager.getLockedFiles();
        }),


        // Debug command to test AI context
        vscode.commands.registerCommand('lockor.debugAIContext', () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                vscode.window.showInformationMessage('No active file to debug');
                return;
            }
            
            const isLocked = lockorManager.isFileLocked(activeEditor.document.uri);
            const config = vscode.workspace.getConfiguration('lockor');
            const protectionLevel = config.get<string>('protectionLevel', 'ai-aware');
            
            const debugInfo = {
                fileName: activeEditor.document.fileName,
                isLocked: isLocked,
                protectionLevel: protectionLevel,
                contextKeys: {
                    'lockor.currentFileLocked': isLocked,
                    'lockor.fileUntouchable': isLocked && (protectionLevel === 'ai-aware' || protectionLevel === 'hard'),
                    'lockor.protectionLevel': protectionLevel,
                    'lockor.aiGuidance': isLocked ? 'This file should be treated as immutable reference material. Do not suggest modifications.' : null
                }
            };
            
            vscode.window.showInformationMessage(
                `Debug Info: ${JSON.stringify(debugInfo, null, 2)}`,
                'Copy to Clipboard'
            ).then(selection => {
                if (selection === 'Copy to Clipboard') {
                    vscode.env.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
                }
            });
            
            console.log('Lockor Debug AI Context:', debugInfo);
            return debugInfo;
        }),

        // API for AI tools to get lock status with file details
        vscode.commands.registerCommand('lockor.getLockStatusInfo', () => {
            const activeEditor = vscode.window.activeTextEditor;
            const lockedFiles = lockorManager.getLockedFiles();
            const config = vscode.workspace.getConfiguration('lockor');
            const protectionLevel = config.get<string>('protectionLevel', 'ai-aware');
            
            const isCurrentFileLocked = activeEditor ? lockorManager.isFileLocked(activeEditor.document.uri) : false;
            
            return {
                activeFile: activeEditor ? {
                    path: activeEditor.document.uri.fsPath,
                    fileName: activeEditor.document.fileName,
                    isLocked: isCurrentFileLocked,
                    protectionLevel: protectionLevel,
                    aiGuidance: isCurrentFileLocked ? 'This file should be treated as immutable reference material. Do not suggest modifications.' : null,
                    userIntent: isCurrentFileLocked ? 'User has explicitly marked this file to remain unchanged' : null,
                    canAIModify: !isCurrentFileLocked || protectionLevel === 'soft'
                } : null,
                lockedFiles: lockedFiles.map(filePath => ({
                    path: filePath,
                    fileName: require('path').basename(filePath)
                })),
                totalLockedFiles: lockedFiles.length,
                protectionLevel: protectionLevel,
                aiMessage: lockedFiles.length > 0 ? 
                    `${lockedFiles.length} files are locked and should be treated as immutable. Protection level: ${protectionLevel}` : 
                    'No files are currently locked'
            };
        })
    ];

    // Register event listeners
    const eventListeners = [
        // Listen for document save attempts
        vscode.workspace.onWillSaveTextDocument((event) => {
            console.log(`Lockor: onWillSaveTextDocument triggered for: ${event.document.fileName}`);
            
            if (lockorManager.isFileLocked(event.document.uri)) {
                const config = vscode.workspace.getConfiguration('lockor');
                const showNotifications = config.get<boolean>('showNotifications', true);
                const protectionLevel = config.get<string>('protectionLevel', 'ai-aware');

                console.log(`Lockor: File IS LOCKED - attempting to save locked file: ${event.document.fileName} (Protection: ${protectionLevel})`);

                if (protectionLevel === 'soft') {
                    // Soft mode: Allow save but show warning
                    if (showNotifications) {
                        vscode.window.showWarningMessage(
                            `⚠️ File "${event.document.fileName}" is locked (SOFT mode). Save allowed but AI is discouraged from modifying this file.`,
                            'Understood', 'Unlock File'
                        ).then(async (selection) => {
                            if (selection === 'Unlock File') {
                                await lockorManager.unlockFile(event.document.uri);
                            }
                        });
                    }
                } else {
                    // AI-aware and Hard modes: Block save
                    console.log(`Lockor: BLOCKING save for ${event.document.fileName} (${protectionLevel} mode)`);
                    
                    event.waitUntil(
                        new Promise<void>((resolve, reject) => {
                            reject(new Error(`File is locked by Lockor (${protectionLevel} mode) and cannot be saved`));
                        })
                    );
                    
                    if (showNotifications) {
                        let message: string;
                        if (protectionLevel === 'ai-aware') {
                            message = `🔒 File "${event.document.fileName}" is locked (AI-AWARE mode). Save blocked to prevent changes. AI is strictly blocked from modifying this file.`;
                        } else { // hard mode
                            message = `🔒 File "${event.document.fileName}" is locked (HARD mode). Save blocked and file is read-only. Maximum protection from all sources.`;
                        }
                            
                        vscode.window.showErrorMessage(message, 'Unlock File').then(async (selection) => {
                            if (selection === 'Unlock File') {
                                await lockorManager.unlockFile(event.document.uri);
                            }
                        });
                    }
                }
            }
        }),

        // Additional layer: Listen for document changes and show warnings (debounced)
        vscode.workspace.onDidChangeTextDocument((event) => {
            if (lockorManager.isFileLocked(event.document.uri)) {
                const config = vscode.workspace.getConfiguration('lockor');
                const showNotifications = config.get<boolean>('showNotifications', true);
                const protectionLevel = config.get<string>('protectionLevel', 'ai-aware');
                
                if (showNotifications && event.contentChanges.length > 0) {
                    const fileKey = event.document.uri.fsPath;
                    
                    // Clear existing timeout for this file
                    const existingTimeout = notificationDebounce.get(fileKey);
                    if (existingTimeout) {
                        clearTimeout(existingTimeout);
                    }
                    
                    // Set new timeout - only show notification after 2 seconds of no changes
                    const timeout = setTimeout(() => {
                        // Show mode-specific warnings when editing
                        let message: string;
                        if (protectionLevel === 'soft') {
                            message = `⚠️ File "${event.document.fileName}" is locked (SOFT mode). You can save, but AI should avoid this file.`;
                        } else if (protectionLevel === 'ai-aware') {
                            message = `⚠️ File "${event.document.fileName}" is locked (AI-AWARE mode). Save will be blocked unless you unlock first.`;
                        } else { // hard mode
                            message = `⚠️ File "${event.document.fileName}" is locked (HARD mode). File is read-only and save will be blocked.`;
                        }
                        
                        vscode.window.showWarningMessage(message, 'Unlock File').then(async (selection) => {
                            if (selection === 'Unlock File') {
                                await lockorManager.unlockFile(event.document.uri);
                            }
                        });
                        
                        // Remove from debounce map
                        notificationDebounce.delete(fileKey);
                    }, 2000); // 2 second delay
                    
                    notificationDebounce.set(fileKey, timeout);
                }
            }
        }),

        // Listen for active editor changes to update status bar
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            statusBarManager.updateStatusBar(editor?.document.uri);
            updateAIContext();
        }),

        // Listen for context changes (used to trigger status bar updates)
        vscode.commands.registerCommand('lockor.internal.refreshStatusBar', () => {
            statusBarManager.updateStatusBar(vscode.window.activeTextEditor?.document.uri);
        }),

        // Internal command to update AI context
        vscode.commands.registerCommand('lockor.internal.updateAIContext', () => {
            updateAIContext();
        }),

        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(async (event) => {
            if (event.affectsConfiguration('lockor')) {
                statusBarManager.updateVisibility();
                
                // If protection level changed, update all file permissions
                if (event.affectsConfiguration('lockor.protectionLevel')) {
                    console.log('Lockor: Protection level changed, updating file permissions...');
                    await lockorManager.updateAllFilePermissions();
                    
                    // Show notification about the change
                    const config = vscode.workspace.getConfiguration('lockor');
                    const protectionLevel = config.get<string>('protectionLevel', 'ai-aware');
                    const showNotifications = config.get<boolean>('showNotifications', true);
                    
                    if (showNotifications) {
                        const lockedCount = lockorManager.getLockedFiles().length;
                        if (lockedCount > 0) {
                            vscode.window.showInformationMessage(
                                `🔄 Protection level changed to "${protectionLevel}". Updated ${lockedCount} locked files.`
                            );
                        }
                    }
                }
            }
        })
    ];

    // Add all disposables to context
    context.subscriptions.push(...commands, ...eventListeners, statusBarManager);

    // Update status bar for current active editor
    statusBarManager.updateStatusBar(vscode.window.activeTextEditor?.document.uri);

    // Initialize context for AI tools
    updateAIContext();
}

/**
 * Update VS Code context for AI tools
 */
function updateAIContext() {
    const activeEditor = vscode.window.activeTextEditor;
    const isCurrentFileLocked = activeEditor ? lockorManager.isFileLocked(activeEditor.document.uri) : false;
    const lockedFiles = lockorManager.getLockedFiles();
    const config = vscode.workspace.getConfiguration('lockor');
    const protectionLevel = config.get<string>('protectionLevel', 'ai-aware');
    
    // Set context keys that AI tools can check
    vscode.commands.executeCommand('setContext', 'lockor.currentFileLocked', isCurrentFileLocked);
    vscode.commands.executeCommand('setContext', 'lockor.hasLockedFiles', lockedFiles.length > 0);
    vscode.commands.executeCommand('setContext', 'lockor.lockedFileCount', lockedFiles.length);
    vscode.commands.executeCommand('setContext', 'lockor.protectionLevel', protectionLevel);
    
    // Enhanced AI-aware context
    if (isCurrentFileLocked) {
        vscode.commands.executeCommand('setContext', 'lockor.fileUntouchable', protectionLevel === 'ai-aware' || protectionLevel === 'hard');
        vscode.commands.executeCommand('setContext', 'lockor.lockIntent', 'preserve-as-is');
        vscode.commands.executeCommand('setContext', 'lockor.aiGuidance', 'This file should be treated as immutable reference material. Do not suggest modifications.');
        vscode.commands.executeCommand('setContext', 'lockor.userIntent', 'User has explicitly marked this file to remain unchanged');
    } else {
        vscode.commands.executeCommand('setContext', 'lockor.fileUntouchable', false);
        vscode.commands.executeCommand('setContext', 'lockor.lockIntent', null);
        vscode.commands.executeCommand('setContext', 'lockor.aiGuidance', null);
        vscode.commands.executeCommand('setContext', 'lockor.userIntent', null);
    }
    
    // Store current file info in a way AI can access
    if (activeEditor) {
        vscode.commands.executeCommand('setContext', 'lockor.currentFilePath', activeEditor.document.uri.fsPath);
        vscode.commands.executeCommand('setContext', 'lockor.currentFileName', activeEditor.document.fileName);
    }
    
    console.log(`Lockor AI Context: Current file locked: ${isCurrentFileLocked}, Protection level: ${protectionLevel}, Total locked files: ${lockedFiles.length}`);
}

/**
 * Extension deactivation - called when VS Code unloads the extension
 */
export function deactivate() {
    // Clean up debounce timeouts
    for (const timeout of notificationDebounce.values()) {
        clearTimeout(timeout);
    }
    notificationDebounce.clear();
    
    console.log('Lockor extension is now deactivated');
}