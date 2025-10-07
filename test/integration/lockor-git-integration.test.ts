/**
 * Integration tests for LockorManager with Git Hook functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { LockorManager } from '../../src/lockor-manager';

// Mock GitHookManager
vi.mock('../../src/git-hook-manager', () => ({
    GitHookManager: vi.fn()
}));

import { GitHookManager } from '../../src/git-hook-manager';

// Mock vscode
vi.mock('vscode', () => ({
    workspace: {
        workspaceFolders: [
            {
                uri: {
                    fsPath: '/test/workspace'
                }
            }
        ],
        getConfiguration: vi.fn(),
        asRelativePath: vi.fn((path: string) => path.replace('/test/workspace/', ''))
    },
    window: {
        showInformationMessage: vi.fn(),
        showWarningMessage: vi.fn()
    },
    commands: {
        executeCommand: vi.fn()
    },
    languages: {
        createDiagnosticCollection: vi.fn(() => ({
            clear: vi.fn(),
            set: vi.fn(),
            dispose: vi.fn()
        }))
    },
    Diagnostic: vi.fn(),
    DiagnosticSeverity: {
        Information: 1,
        Warning: 2,
        Error: 3
    },
    Range: vi.fn(),
    Position: vi.fn(),
    workspaceState: {
        get: vi.fn(),
        update: vi.fn()
    },
    Uri: {
        file: vi.fn((path: string) => ({ fsPath: path })),
        joinPath: vi.fn()
    }
}));

// Mock GitHookManager
vi.mock('../src/git-hook-manager', () => ({
    GitHookManager: vi.fn().mockImplementation(() => ({
        updateHook: vi.fn()
    }))
}));

describe('LockorManager Git Integration', () => {
    let lockorManager: LockorManager;
    let mockContext: any;
    let mockGitHookManager: any;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Mock extension context
        mockContext = {
            workspaceState: {
                get: vi.fn().mockReturnValue([]),
                update: vi.fn()
            }
        };

        // Mock configuration
        const mockConfig = {
            get: vi.fn((key: string, defaultValue: any) => {
                const configs: Record<string, any> = {
                    'protectionLevel': 'ai-aware',
                    'showNotifications': true,
                    'createStatusFile': true,
                    'addVisibleMarkers': false
                };
                return configs[key] || defaultValue;
            })
        };
        (vscode.workspace.getConfiguration as any).mockReturnValue(mockConfig);

        // Mock GitHookManager
        mockGitHookManager = {
            updateHook: vi.fn()
        };
        vi.mocked(GitHookManager).mockImplementation(() => mockGitHookManager as any);

        lockorManager = new LockorManager(mockContext);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Git Hook Integration', () => {
        it('should call updateHook when locking a file', async () => {
            const testUri = vscode.Uri.file('/test/workspace/config.js');
            
            await lockorManager.lockFile(testUri);
            
            expect(mockGitHookManager.updateHook).toHaveBeenCalled();
        });

        it('should call updateHook when unlocking a file', async () => {
            const testUri = vscode.Uri.file('/test/workspace/config.js');
            
            // First lock the file
            await lockorManager.lockFile(testUri);
            vi.clearAllMocks();
            
            // Then unlock it
            await lockorManager.unlockFile(testUri);
            
            expect(mockGitHookManager.updateHook).toHaveBeenCalled();
        });

        it('should call updateHook when toggling file lock', async () => {
            const testUri = vscode.Uri.file('/test/workspace/config.js');
            
            await lockorManager.toggleFileLock(testUri);
            
            expect(mockGitHookManager.updateHook).toHaveBeenCalled();
        });

        it('should call updateHook when updating all file permissions', async () => {
            await lockorManager.updateAllFilePermissions();
            
            expect(mockGitHookManager.updateHook).toHaveBeenCalled();
        });

        it('should have updateGitHook method', async () => {
            await lockorManager.updateGitHook();
            
            expect(mockGitHookManager.updateHook).toHaveBeenCalled();
        });
    });

    describe('Configuration Changes', () => {
        it('should handle git hook setting changes', async () => {
            // Mock configuration change
            const mockConfig = {
                get: vi.fn((key: string, defaultValue: any) => {
                    if (key === 'gitPreCommitHook') return true;
                    return defaultValue;
                })
            };
            (vscode.workspace.getConfiguration as any).mockReturnValue(mockConfig);

            // Simulate configuration change
            await lockorManager.updateGitHook();
            
            expect(mockGitHookManager.updateHook).toHaveBeenCalled();
        });
    });
});


