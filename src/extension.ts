/**
 * Lockor Extension - Main entry point
 * 
 * This extension prevents Cursor/VS Code from modifying certain files by:
 * - Tracking locked files in workspace state
 * - Intercepting save operations on locked files
 * - Providing commands to lock/unlock files
 * - Showing visual indicators for locked files
 */
// Act test change - 2025-09-06 00:40:24 UTC
// Pipeline logic test - 2025-09-05 23:51:14 UTC
// Act test change - 2025-09-06 00:40:24 UTC

import * as vscode from 'vscode';
import { LockorManager } from './lockor-manager';
import { StatusBarManager } from './status-bar-manager';

let lockorManager: LockorManager;
let statusBarManager: StatusBarManager;

// Debouncing for document change notifications
// Act test change - 2025-09-06 00:40:24 UTC
// Pipeline logic test - 2025-09-05 23:51:14 UTC
// Act test change - 2025-09-06 00:40:24 UTC
const notificationDebounce = new Map<string, NodeJS.Timeout>();

// Track which files have already shown edit warnings this session
// Act test change - 2025-09-06 00:40:24 UTC
// Pipeline logic test - 2025-09-05 23:51:14 UTC
// Act test change - 2025-09-06 00:40:24 UTC
const editWarningsShown = new Set<string>();

/**
 * Extension activation - called when VS Code loads the extension
 */
// Act test change - 2025-09-06 00:40:24 UTC
// Pipeline logic test - 2025-09-05 23:51:14 UTC
// Act test change - 2025-09-06 00:40:24 UTC
export function activate(context: vscode.ExtensionContext) {
    console.log('Lockor extension is now active');

    // Initialize managers
    lockorManager = new LockorManager(context);
    statusBarManager = new StatusBarManager(lockorManager);

    // Initialize diagnostics for existing locked files on startup
    lockorManager.updateWorkspaceDiagnostics().catch(console.error);

    // Register commands
    const commands = [
        vscode.commands.registerCommand('lockor.lockFile', async () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                await lockorManager.lockFile(activeEditor.document.uri);
                statusBarManager.updateStatusBar(activeEditor.document.uri);
            } else {
                vscode.window.showWarningMessage('No active file to lock');
            }
        }),

        vscode.commands.registerCommand('lockor.unlockFile', async () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                await lockorManager.unlockFile(activeEditor.document.uri);
                statusBarManager.updateStatusBar(activeEditor.document.uri);
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
                statusBarManager.updateStatusBar(targetUri);
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
                const isLocked = lockorManager.isFileLocked(targetUri);
                const fileName = require('path').basename(targetUri.fsPath);
                const filePath = targetUri.fsPath;
                
                console.log(`Lockor: File ${fileName} is ${isLocked ? 'LOCKED' : 'UNLOCKED'}`);
                
                const status = isLocked ? '🔒 LOCKED' : '🔓 UNLOCKED';
                const message = `Lockor: File Lock Status - ${fileName} is ${status}`;
                
                vscode.window.showInformationMessage(message, 'View Details').then(selection => {
                    if (selection === 'View Details') {
                        // Create a temporary document to show formatted details
                        const details = `Lockor: File Lock Status Details

File: ${fileName}
Full Path: ${filePath}
Lock Status: ${status}
Checked: ${new Date().toLocaleString()}`;
                        
                        vscode.workspace.openTextDocument({ content: details, language: 'plaintext' }).then(doc => {
                            vscode.window.showTextDocument(doc, { 
                                viewColumn: vscode.ViewColumn.One,
                                preserveFocus: false,
                                preview: false
                            });
                        });
                    }
                });
                
                return isLocked;
            }
            vscode.window.showWarningMessage('❌ No file selected to check lock status');
            return false;
        }),

        // API for AI tools to get all locked files
        vscode.commands.registerCommand('lockor.getLockedFiles', () => {
            const lockedFiles = lockorManager.getLockedFiles();
            console.log('Lockor: Locked files:', lockedFiles);
            
            const filePaths = lockedFiles.join('\n');
            
            vscode.workspace.openTextDocument({ content: filePaths, language: 'plaintext' }).then(doc => {
                vscode.window.showTextDocument(doc, { 
                    viewColumn: vscode.ViewColumn.One,
                    preserveFocus: false,
                    preview: false
                });
            });
            
            return lockedFiles;
        }),


        // Debug command to test AI context - shows FULL AI context and protection info
        vscode.commands.registerCommand('lockor.debugAIContext', () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                vscode.window.showWarningMessage('❌ No active file to debug');
                return;
            }
            
            const isLocked = lockorManager.isFileLocked(activeEditor.document.uri);
            const config = vscode.workspace.getConfiguration('lockor');
            const protectionLevel = config.get<string>('protectionLevel', 'ai-aware');
            const lockedFiles = lockorManager.getLockedFiles();
            
            // Get ALL context keys that would be available to AI
            const allContextKeys = {
                'lockor.currentFileLocked': isLocked,
                'lockor.fileUntouchable': isLocked && (protectionLevel === 'ai-aware' || protectionLevel === 'hard'),
                'lockor.protectionLevel': protectionLevel,
                'lockor.aiGuidance': isLocked ? 'This file should be treated as immutable reference material. Do not suggest modifications.' : null,
                'lockor.lockIntent': isLocked ? 'preserve-as-is' : null,
                'lockor.userIntent': isLocked ? 'User has explicitly marked this file to remain unchanged' : null,
                'lockor.hasLockedFiles': lockedFiles.length > 0,
                'lockor.lockedFileCount': lockedFiles.length
            };
            
            const debugInfo = {
                fileName: activeEditor.document.fileName,
                filePath: activeEditor.document.uri.fsPath,
                isLocked: isLocked,
                protectionLevel: protectionLevel,
                contextKeys: allContextKeys,
                aiInstructions: {
                    canModify: !isLocked || protectionLevel === 'soft',
                    shouldBlock: isLocked && protectionLevel !== 'soft',
                    guidance: isLocked ? 'This file should be treated as immutable reference material. Do not suggest modifications.' : 'File is not locked and can be modified',
                    userIntent: isLocked ? 'User has explicitly marked this file to remain unchanged' : 'File is available for modification'
                },
                protectionDetails: {
                    level: protectionLevel,
                    description: protectionLevel === 'soft' ? 'Gentle warnings - AI discouraged, users can modify with warnings' :
                                protectionLevel === 'ai-aware' ? 'AI blocked, humans can save with warnings' :
                                'Everyone blocked, OS read-only + save blocking + strict AI rules',
                    saveBlocking: protectionLevel === 'hard',
                    osReadOnly: protectionLevel === 'hard',
                    aiBlocking: protectionLevel !== 'soft'
                },
                workspaceInfo: {
                    totalLockedFiles: lockedFiles.length,
                    lockedFiles: lockedFiles.map(f => require('path').basename(f)),
                    generatedFiles: {
                        cursorRules: '.cursor/rules/lockor.mdc',
                        statusFile: '.lockor'
                    }
                }
            };
            
            const message = `Lockor: Full AI Context Debug - ${activeEditor.document.fileName}`;
            
            vscode.window.showInformationMessage(message, 'View Full Context', 'View JSON', 'Copy to Clipboard').then(selection => {
                if (selection === 'View Full Context') {
                    const fullContext = `Lockor: Complete AI Context & Protection Info

=== CURRENT FILE ===
File: ${activeEditor.document.fileName}
Path: ${activeEditor.document.uri.fsPath}
Locked: ${isLocked ? 'YES' : 'NO'}

=== PROTECTION DETAILS ===
Protection Level: ${protectionLevel.toUpperCase()}
Description: ${debugInfo.protectionDetails.description}
Save Blocking: ${debugInfo.protectionDetails.saveBlocking ? 'YES' : 'NO'}
OS Read-Only: ${debugInfo.protectionDetails.osReadOnly ? 'YES' : 'NO'}
AI Blocking: ${debugInfo.protectionDetails.aiBlocking ? 'YES' : 'NO'}

=== AI CONTEXT KEYS ===
${Object.entries(allContextKeys).map(([key, value]) => `  ${key}: ${value}`).join('\n')}

=== AI INSTRUCTIONS ===
Can Modify: ${debugInfo.aiInstructions.canModify ? 'YES' : 'NO'}
Should Block: ${debugInfo.aiInstructions.shouldBlock ? 'YES' : 'NO'}
Guidance: ${debugInfo.aiInstructions.guidance}
User Intent: ${debugInfo.aiInstructions.userIntent}

=== WORKSPACE INFO ===
Total Locked Files: ${lockedFiles.length}
Locked Files: ${lockedFiles.map(f => require('path').basename(f)).join(', ')}

Generated Files:
  - Cursor Rules: .cursor/rules/lockor.mdc
  - Status File: .lockor

=== ALL LOCKED FILES ===
${lockedFiles.map((f, i) => `${i + 1}. ${f}`).join('\n')}`;
                    
                    vscode.workspace.openTextDocument({ content: fullContext, language: 'plaintext' }).then(doc => {
                        vscode.window.showTextDocument(doc, { 
                            viewColumn: vscode.ViewColumn.One,
                            preserveFocus: false,
                            preview: false
                        });
                    });
                } else if (selection === 'View JSON') {
                    const jsonData = `Lockor: Complete AI Context JSON

${JSON.stringify(debugInfo, null, 2)}`;
                    
                    vscode.workspace.openTextDocument({ content: jsonData, language: 'json' }).then(doc => {
                        vscode.window.showTextDocument(doc, { 
                            viewColumn: vscode.ViewColumn.One,
                            preserveFocus: false,
                            preview: false
                        });
                    });
                } else if (selection === 'Copy to Clipboard') {
                    vscode.env.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
                    vscode.window.showInformationMessage('✅ Full AI context copied to clipboard!');
                }
            });
            
            console.log('Lockor Full AI Context:', debugInfo);
            return debugInfo;
        }),

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
                    // Soft mode: Allow human to save but show warning
                    if (showNotifications) {
                        vscode.window.showWarningMessage(
                            `⚠️ File "${event.document.fileName}" is locked (SOFT mode). You can save, but consider if changes are needed.`,
                            'Understood', 'Unlock File'
                        ).then(async (selection) => {
                            if (selection === 'Unlock File') {
                                await lockorManager.unlockFile(event.document.uri);
                                statusBarManager.updateStatusBar(event.document.uri);
                            }
                        });
                    }
                } else if (protectionLevel === 'ai-aware') {
                    // AI-aware mode: Allow human to save silently (no save warning)
                    // The edit warning (shown once per session) is sufficient
                } else {
                    // Hard mode: Block save for everyone
                    console.log(`Lockor: BLOCKING save for ${event.document.fileName} (${protectionLevel} mode)`);
                    
                    event.waitUntil(
                        new Promise<void>((resolve, reject) => {
                            reject(new Error(`File is locked by Lockor (${protectionLevel} mode) and cannot be saved`));
                        })
                    );
                    
                    if (showNotifications) {
                        vscode.window.showErrorMessage(
                            `🔒 File "${event.document.fileName}" is locked (HARD mode). File is read-only and save blocked for everyone.`,
                            'Unlock File'
                        ).then(async (selection) => {
                            if (selection === 'Unlock File') {
                                await lockorManager.unlockFile(event.document.uri);
                                statusBarManager.updateStatusBar(event.document.uri);
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
                    
                    // For AI-aware mode, only show warning once per session
                    if (protectionLevel === 'ai-aware' && editWarningsShown.has(fileKey)) {
                        return; // Already warned about this file in this session
                    }
                    
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
                            message = `⚠️ File "${event.document.fileName}" is locked (SOFT mode). You can edit and save, but consider if changes are needed.`;
                        } else if (protectionLevel === 'ai-aware') {
                            message = `⚠️ File "${event.document.fileName}" is locked (AI-AWARE mode). You can edit and save, but AI is blocked from this file.`;
                            editWarningsShown.add(fileKey); // Mark as warned for this session
                        } else { // hard mode
                            message = `⚠️ File "${event.document.fileName}" is locked (HARD mode). File is read-only and save will be blocked.`;
                        }
                        
                        vscode.window.showWarningMessage(message, 'Unlock File').then(async (selection) => {
                            if (selection === 'Unlock File') {
                                await lockorManager.unlockFile(event.document.uri);
                                statusBarManager.updateStatusBar(event.document.uri);
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

        // Listen for when files are opened to show lock warnings
        vscode.workspace.onDidOpenTextDocument((document) => {
            if (lockorManager.isFileLocked(document.uri)) {
                const config = vscode.workspace.getConfiguration('lockor');
                const showNotifications = config.get<boolean>('showNotifications', true);
                const protectionLevel = config.get<string>('protectionLevel', 'ai-aware');
                
                if (showNotifications) {
                    let message: string;
                    if (protectionLevel === 'soft') {
                        message = `⚠️ File "${document.fileName}" is locked (SOFT mode). You can edit and save, but consider if changes are needed.`;
                    } else if (protectionLevel === 'ai-aware') {
                        message = `⚠️ File "${document.fileName}" is locked (AI-AWARE mode). You can edit and save, but AI is blocked from this file.`;
                    } else { // hard mode
                        message = `⚠️ File "${document.fileName}" is locked (HARD mode). File is read-only and save will be blocked.`;
                    }
                    
                    vscode.window.showWarningMessage(message, 'Unlock File').then(async (selection) => {
                        if (selection === 'Unlock File') {
                            await lockorManager.unlockFile(document.uri);
                            statusBarManager.updateStatusBar(document.uri);
                        }
                    });
                }
            }
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
                
                // If git pre-commit hook setting changed, update hook
                if (event.affectsConfiguration('lockor.gitPreCommitHook')) {
                    console.log('Lockor: Git pre-commit hook setting changed, updating hook...');
                    await lockorManager.updateGitHook();
                    
                    const config = vscode.workspace.getConfiguration('lockor');
                    const hookEnabled = config.get<boolean>('gitPreCommitHook', true);
                    const showNotifications = config.get<boolean>('showNotifications', true);
                    
                    if (showNotifications) {
                        const status = hookEnabled ? 'enabled' : 'disabled';
                        vscode.window.showInformationMessage(
                            `🔄 Git pre-commit hook ${status}. This prevents commits of locked files.`
                        );
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
    
    // Install git hook if enabled
    lockorManager.updateGitHook();
}

/**
 * Update VS Code context for AI tools
 */
// Act test change - 2025-09-06 00:40:24 UTC
// Pipeline logic test - 2025-09-05 23:51:14 UTC
// Act test change - 2025-09-06 00:40:24 UTC
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
// Act test change - 2025-09-06 00:40:24 UTC
// Pipeline logic test - 2025-09-05 23:51:14 UTC
// Act test change - 2025-09-06 00:40:24 UTC
export function deactivate() {
    // Clean up debounce timeouts
    for (const timeout of notificationDebounce.values()) {
        clearTimeout(timeout);
    }
    notificationDebounce.clear();
    
    // Clear session tracking
    editWarningsShown.clear();
    
    console.log('Lockor extension is now deactivated');
}
// Simple pipeline test - Fri Sep  5 20:52:32 EDT 2025
