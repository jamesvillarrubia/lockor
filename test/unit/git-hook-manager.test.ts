/**
 * Tests for GitHookManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
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
        getConfiguration: vi.fn()
    }
}));

// Mock fs
vi.mock('fs', () => ({
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    chmodSync: vi.fn(),
    unlinkSync: vi.fn(),
    constants: {
        S_IWUSR: 0o200,
        S_IWGRP: 0o020,
        S_IWOTH: 0o002
    }
}));

// Mock path
vi.mock('path', () => ({
    join: vi.fn((...args) => args.join('/')),
    dirname: vi.fn((path) => path.split('/').slice(0, -1).join('/')),
    basename: vi.fn((path) => path.split('/').pop())
}));

// Mock child_process
vi.mock('child_process', () => ({
    exec: vi.fn()
}));

describe('GitHookManager', () => {
    let gitHookManager: GitHookManager;
    let mockConfig: any;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Mock configuration
        mockConfig = {
            get: vi.fn()
        };
        (vscode.workspace.getConfiguration as any).mockReturnValue(mockConfig);
        
        gitHookManager = new GitHookManager();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('isGitRepository', () => {
        it('should return false when no workspace folder', async () => {
            // Create a new GitHookManager with no workspace folder
            const mockConfig = {
                get: vi.fn().mockReturnValue(true)
            };
            vscode.workspace.getConfiguration.mockReturnValue(mockConfig);
            vscode.workspace.workspaceFolders = undefined;
            
            const testGitHookManager = new GitHookManager();
            const result = await (testGitHookManager as any).isGitRepository();
            expect(result).toBe(false);
        });
    });

    describe('getLockedFiles', () => {
        it('should return empty array when no workspace folder', async () => {
            // Create a new GitHookManager with no workspace folder
            const mockConfig = {
                get: vi.fn().mockReturnValue(true)
            };
            vscode.workspace.getConfiguration.mockReturnValue(mockConfig);
            vscode.workspace.workspaceFolders = undefined;
            
            const testGitHookManager = new GitHookManager();
            const result = await (testGitHookManager as any).getLockedFiles();
            expect(result).toEqual([]);
        });
    });

    describe('generateHookContent', () => {
        it('should generate valid shell script', () => {
            const content = (gitHookManager as any).generateHookContent();
            
            expect(content).toContain('#!/bin/sh');
            expect(content).toContain('git diff --name-only --cached');
            expect(content).toContain('lockor get-locked-files');
            expect(content).toContain('COMMIT BLOCKED');
        });
    });

    describe('installHook', () => {
        it('should not install hook when disabled', async () => {
            mockConfig.get.mockReturnValue(false); // gitPreCommitHook disabled

            const result = await gitHookManager.installHook();
            
            expect(result).toBe(false);
        });

        it('should not install hook when no workspace folder', async () => {
            mockConfig.get.mockReturnValue(true);
            vscode.workspace.workspaceFolders = undefined;
            
            const testGitHookManager = new GitHookManager();
            const result = await testGitHookManager.installHook();
            
            expect(result).toBe(false);
        });
    });

    describe('removeHook', () => {
        it('should return true when no workspace folder', async () => {
            vscode.workspace.workspaceFolders = undefined;
            
            const testGitHookManager = new GitHookManager();
            const result = await testGitHookManager.removeHook();
            
            expect(result).toBe(true);
        });
    });

    describe('isHookInstalled', () => {
        it('should return false when no workspace folder', () => {
            vscode.workspace.workspaceFolders = undefined;
            
            const testGitHookManager = new GitHookManager();
            const result = testGitHookManager.isHookInstalled();
            
            expect(result).toBe(false);
        });
    });
});


