/**
 * StatusBarManager - Manages status bar display for locked files
 * 
 * Shows a lock icon in the status bar when the current file is locked,
 * and provides quick access to toggle the lock state.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { LockorManager } from './lockor-manager';

export class StatusBarManager implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;
    private hideTimeout: NodeJS.Timeout | undefined;

    constructor(private lockorManager: LockorManager) {
        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100 // Priority - higher numbers appear more to the left
        );

        this.statusBarItem.command = 'lockor.toggleLock';
        this.updateVisibility();
    }

    /**
     * Update status bar visibility based on configuration
     */
    public updateVisibility(): void {
        const config = vscode.workspace.getConfiguration('lockor');
        const showStatusBarItem = config.get<boolean>('showStatusBarItem', true);

        if (showStatusBarItem) {
            this.updateStatusBar(vscode.window.activeTextEditor?.document.uri);
        } else {
            this.statusBarItem.hide();
        }
    }

    /**
     * Update status bar content based on current file
     */
    public updateStatusBar(uri?: vscode.Uri): void {
        const config = vscode.workspace.getConfiguration('lockor');
        const showStatusBarItem = config.get<boolean>('showStatusBarItem', true);

        if (!showStatusBarItem) {
            this.statusBarItem.hide();
            return;
        }

        if (!uri) {
            this.statusBarItem.hide();
            return;
        }

        const isLocked = this.lockorManager.isFileLocked(uri);
        const fileName = path.basename(uri.fsPath);

        // Clear any existing hide timeout
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = undefined;
        }

        if (isLocked) {
            this.statusBarItem.text = '🔒 Locked';
            this.statusBarItem.tooltip = `File "${fileName}" is locked. Click to unlock.`;
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            this.statusBarItem.show();
        } else {
            // Show unlocked status - keep it visible at all times
            this.statusBarItem.text = '🔓';
            this.statusBarItem.tooltip = `File "${fileName}" is unlocked. Click to lock.`;
            this.statusBarItem.backgroundColor = undefined;
            this.statusBarItem.show();
        }
    }

    /**
     * Force show status bar (useful after lock state changes)
     */
    public show(): void {
        this.updateStatusBar(vscode.window.activeTextEditor?.document.uri);
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }
        this.statusBarItem.dispose();
    }
}
