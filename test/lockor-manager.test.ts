/**
 * Unit tests for LockorManager class
 * Tests core file locking functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LockorManager } from '../src/lockor-manager';
import { mockVSCode } from './setup';

// Mock ExtensionContext
const mockContext = {
  workspaceState: {
    get: vi.fn(),
    update: vi.fn()
  }
};

describe('LockorManager', () => {
  let lockorManager: LockorManager;
  let mockContext: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup mock context
    mockContext = {
      workspaceState: {
        get: vi.fn().mockReturnValue([]),
        update: vi.fn()
      }
    };

    // Setup VS Code mocks
    mockVSCode.workspace.getConfiguration.mockReturnValue({
      get: vi.fn().mockImplementation((key: string, defaultValue: any) => {
        const config: Record<string, any> = {
          'protectionLevel': 'ai-aware',
          'showNotifications': true,
          'addVisibleMarkers': false,
          'createStatusFile': true
        };
        return config[key] ?? defaultValue;
      })
    });

    mockVSCode.window.showInformationMessage.mockResolvedValue(undefined);
    mockVSCode.window.showWarningMessage.mockResolvedValue(undefined);
    mockVSCode.commands.executeCommand.mockResolvedValue(undefined);

    // Create LockorManager instance
    lockorManager = new LockorManager(mockContext as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('File Locking', () => {
    it('should lock a file successfully', async () => {
      const testUri = { fsPath: '/test/file.txt' };
      
      await lockorManager.lockFile(testUri as any);
      
      expect(lockorManager.isFileLocked(testUri as any)).toBe(true);
      expect(mockContext.workspaceState.update).toHaveBeenCalledWith(
        'lockor.lockedFiles',
        ['/test/file.txt']
      );
    });

    it('should unlock a file successfully', async () => {
      const testUri = { fsPath: '/test/file.txt' };
      
      // First lock the file
      await lockorManager.lockFile(testUri as any);
      expect(lockorManager.isFileLocked(testUri as any)).toBe(true);
      
      // Then unlock it
      await lockorManager.unlockFile(testUri as any);
      expect(lockorManager.isFileLocked(testUri as any)).toBe(false);
      expect(mockContext.workspaceState.update).toHaveBeenCalledWith(
        'lockor.lockedFiles',
        []
      );
    });

    it('should toggle file lock state', async () => {
      const testUri = { fsPath: '/test/file.txt' };
      
      // Initially unlocked
      expect(lockorManager.isFileLocked(testUri as any)).toBe(false);
      
      // Toggle to locked
      await lockorManager.toggleFileLock(testUri as any);
      expect(lockorManager.isFileLocked(testUri as any)).toBe(true);
      
      // Toggle to unlocked
      await lockorManager.toggleFileLock(testUri as any);
      expect(lockorManager.isFileLocked(testUri as any)).toBe(false);
    });

    it('should not lock the same file twice', async () => {
      const testUri = { fsPath: '/test/file.txt' };
      
      // Lock the file
      await lockorManager.lockFile(testUri as any);
      
      // Try to lock again
      await lockorManager.lockFile(testUri as any);
      
      // Should show information message
      expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
        'File "file.txt" is already locked'
      );
    });

    it('should not unlock a file that is not locked', async () => {
      const testUri = { fsPath: '/test/file.txt' };
      
      // Try to unlock without locking first
      await lockorManager.unlockFile(testUri as any);
      
      // Should show information message
      expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
        'File "file.txt" is not locked'
      );
    });
  });

  describe('File State Management', () => {
    it('should load locked files from workspace state', () => {
      const storedFiles = ['/test/file1.txt', '/test/file2.txt'];
      mockContext.workspaceState.get.mockReturnValue(storedFiles);
      
      const newManager = new LockorManager(mockContext as any);
      
      expect(newManager.getLockedFiles()).toEqual(storedFiles);
    });

    it('should return empty array when no files are locked', () => {
      expect(lockorManager.getLockedFiles()).toEqual([]);
    });

    it('should return all locked files', async () => {
      const testUri1 = { fsPath: '/test/file1.txt' };
      const testUri2 = { fsPath: '/test/file2.txt' };
      
      await lockorManager.lockFile(testUri1 as any);
      await lockorManager.lockFile(testUri2 as any);
      
      const lockedFiles = lockorManager.getLockedFiles();
      expect(lockedFiles).toHaveLength(2);
      expect(lockedFiles).toContain('/test/file1.txt');
      expect(lockedFiles).toContain('/test/file2.txt');
    });
  });

  describe('Protection Levels', () => {
    it('should handle soft protection level', async () => {
      mockVSCode.workspace.getConfiguration.mockReturnValue({
        get: vi.fn().mockImplementation((key: string, defaultValue: any) => {
          const config: Record<string, any> = {
            'protectionLevel': 'soft',
            'showNotifications': true
          };
          return config[key] ?? defaultValue;
        })
      });

      const testUri = { fsPath: '/test/file.txt' };
      await lockorManager.lockFile(testUri as any);
      
      // In soft mode, should show notification but allow saves
      expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
        '🔒 File "file.txt" is now locked'
      );
    });

    it('should handle hard protection level', async () => {
      mockVSCode.workspace.getConfiguration.mockReturnValue({
        get: vi.fn().mockImplementation((key: string, defaultValue: any) => {
          const config: Record<string, any> = {
            'protectionLevel': 'hard',
            'showNotifications': true
          };
          return config[key] ?? defaultValue;
        })
      });

      const testUri = { fsPath: '/test/file.txt' };
      
      // Mock fs operations to prevent timeout
      const fs = await import('fs');
      vi.spyOn(fs, 'stat').mockImplementation((path, callback) => {
        callback(null, { mode: 0o644 } as any);
        return {} as any;
      });
      vi.spyOn(fs, 'chmod').mockImplementation((path, mode, callback) => {
        callback(null);
        return {} as any;
      });
      
      await lockorManager.lockFile(testUri as any);
      
      // In hard mode, should show notification
      expect(mockVSCode.window.showInformationMessage).toHaveBeenCalledWith(
        '🔒 File "file.txt" is now locked'
      );
    }, 10000);
  });

  describe('File Operations', () => {
    it('should handle file path normalization', () => {
      const testUri1 = { fsPath: '/test/file.txt' };
      const testUri2 = { fsPath: '/test/file.txt' };
      
      // Both URIs should be treated as the same file
      expect(lockorManager.isFileLocked(testUri1 as any)).toBe(false);
      expect(lockorManager.isFileLocked(testUri2 as any)).toBe(false);
    });

    it('should persist state changes', async () => {
      const testUri = { fsPath: '/test/file.txt' };
      
      await lockorManager.lockFile(testUri as any);
      
      // Should call update to persist state
      expect(mockContext.workspaceState.update).toHaveBeenCalledWith(
        'lockor.lockedFiles',
        ['/test/file.txt']
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle workspace state update errors gracefully', async () => {
      mockContext.workspaceState.update.mockRejectedValue(new Error('Storage error'));
      
      const testUri = { fsPath: '/test/file.txt' };
      
      // Should not throw error
      await expect(lockorManager.lockFile(testUri as any)).resolves.not.toThrow();
    });

    it('should handle missing workspace state gracefully', () => {
      mockContext.workspaceState.get.mockReturnValue(undefined);
      
      // Should not throw error when creating manager
      expect(() => new LockorManager(mockContext as any)).not.toThrow();
    });
  });
});
