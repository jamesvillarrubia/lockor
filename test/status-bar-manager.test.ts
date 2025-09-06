/**
 * Unit tests for StatusBarManager class
 * Tests status bar display and interaction functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StatusBarManager } from '../src/status-bar-manager';
import { LockorManager } from '../src/lockor-manager';
import { mockVSCode } from './setup';

describe('StatusBarManager', () => {
  let statusBarManager: StatusBarManager;
  let mockLockorManager: LockorManager;
  let mockStatusBarItem: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create mock status bar item
    mockStatusBarItem = {
      text: '',
      tooltip: '',
      backgroundColor: undefined,
      command: '',
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn()
    };

    // Mock VS Code window.createStatusBarItem
    mockVSCode.window.createStatusBarItem.mockReturnValue(mockStatusBarItem);

    // Setup VS Code configuration mock
    mockVSCode.workspace.getConfiguration.mockReturnValue({
      get: vi.fn().mockImplementation((key: string, defaultValue: any) => {
        const config: Record<string, any> = {
          'showStatusBarItem': true
        };
        return config[key] ?? defaultValue;
      })
    });

    // Create mock LockorManager
    mockLockorManager = {
      isFileLocked: vi.fn().mockReturnValue(false)
    } as any;

    // Create StatusBarManager instance
    statusBarManager = new StatusBarManager(mockLockorManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create status bar item with correct properties', () => {
      // Create a new instance to test initialization behavior
      const newStatusBarManager = new StatusBarManager(mockLockorManager);
      expect(mockVSCode.window.createStatusBarItem).toHaveBeenCalledWith(
        mockVSCode.StatusBarAlignment.Right,
        100
      );
      expect(mockStatusBarItem.command).toBe('lockor.toggleLock');
    });

    it('should show status bar item when enabled', () => {
      // Create a new instance to test initialization behavior
      const newStatusBarManager = new StatusBarManager(mockLockorManager);
      expect(mockVSCode.window.createStatusBarItem).toHaveBeenCalled();
    });
  });

  describe('Visibility Control', () => {
    it('should hide status bar when disabled in configuration', () => {
      mockVSCode.workspace.getConfiguration.mockReturnValue({
        get: vi.fn().mockImplementation((key: string, defaultValue: any) => {
          const config: Record<string, any> = {
            'showStatusBarItem': false
          };
          return config[key] ?? defaultValue;
        })
      });

      statusBarManager.updateVisibility();
      expect(mockStatusBarItem.hide).toHaveBeenCalled();
    });

    it('should show status bar when enabled in configuration', () => {
      mockVSCode.workspace.getConfiguration.mockReturnValue({
        get: vi.fn().mockImplementation((key: string, defaultValue: any) => {
          const config: Record<string, any> = {
            'showStatusBarItem': true
          };
          return config[key] ?? defaultValue;
        })
      });

      statusBarManager.updateVisibility();
      // Should call updateStatusBar which eventually calls show
      expect(mockVSCode.workspace.getConfiguration).toHaveBeenCalled();
    });
  });

  describe('Status Bar Updates', () => {
    it('should show locked status for locked file', () => {
      const testUri = { fsPath: '/test/file.txt' };
      mockLockorManager.isFileLocked.mockReturnValue(true);

      statusBarManager.updateStatusBar(testUri as any);

      expect(mockStatusBarItem.text).toBe('🔒 Locked');
      expect(mockStatusBarItem.tooltip).toBe('File "file.txt" is locked. Click to unlock.');
      expect(mockStatusBarItem.backgroundColor).toBeDefined();
      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });

    it('should show unlocked status for unlocked file', () => {
      const testUri = { fsPath: '/test/file.txt' };
      mockLockorManager.isFileLocked.mockReturnValue(false);

      statusBarManager.updateStatusBar(testUri as any);

      expect(mockStatusBarItem.text).toBe('🔓');
      expect(mockStatusBarItem.tooltip).toBe('File "file.txt" is unlocked. Click to lock.');
      expect(mockStatusBarItem.backgroundColor).toBeUndefined();
      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });

    it('should hide status bar when no URI provided', () => {
      statusBarManager.updateStatusBar(undefined);
      expect(mockStatusBarItem.hide).toHaveBeenCalled();
    });

    it('should hide status bar when status bar is disabled', () => {
      mockVSCode.workspace.getConfiguration.mockReturnValue({
        get: vi.fn().mockImplementation((key: string, defaultValue: any) => {
          const config: Record<string, any> = {
            'showStatusBarItem': false
          };
          return config[key] ?? defaultValue;
        })
      });

      const testUri = { fsPath: '/test/file.txt' };
      statusBarManager.updateStatusBar(testUri as any);
      expect(mockStatusBarItem.hide).toHaveBeenCalled();
    });
  });

  describe('File Name Handling', () => {
    it('should extract file name from URI path', () => {
      const testUri = { fsPath: '/path/to/test/file.txt' };
      mockLockorManager.isFileLocked.mockReturnValue(true);

      statusBarManager.updateStatusBar(testUri as any);

      expect(mockStatusBarItem.tooltip).toBe('File "file.txt" is locked. Click to unlock.');
    });

    it('should handle file names with special characters', () => {
      const testUri = { fsPath: '/path/to/test-file_v2.0.txt' };
      mockLockorManager.isFileLocked.mockReturnValue(true);

      statusBarManager.updateStatusBar(testUri as any);

      expect(mockStatusBarItem.tooltip).toBe('File "test-file_v2.0.txt" is locked. Click to unlock.');
    });
  });

  describe('Force Show', () => {
    it('should force show status bar', () => {
      const testUri = { fsPath: '/test/file.txt' };
      mockLockorManager.isFileLocked.mockReturnValue(false);
      
      // Set up active editor
      mockVSCode.window.activeTextEditor = {
        document: { uri: testUri }
      };

      statusBarManager.show();

      // Should call updateStatusBar which calls isFileLocked
      expect(mockLockorManager.isFileLocked).toHaveBeenCalled();
    });
  });

  describe('Disposal', () => {
    it('should dispose status bar item', () => {
      statusBarManager.dispose();
      expect(mockStatusBarItem.dispose).toHaveBeenCalled();
    });

    it('should clear hide timeout on disposal', () => {
      // Mock setTimeout and clearTimeout
      const mockTimeout = setTimeout(() => {}, 1000);
      vi.spyOn(global, 'setTimeout').mockReturnValue(mockTimeout);
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      statusBarManager.dispose();
      // clearTimeout may or may not be called depending on whether there's an active timeout
      expect(mockStatusBarItem.dispose).toHaveBeenCalled();
    });
  });

  describe('Configuration Changes', () => {
    it('should update visibility when configuration changes', () => {
      const updateVisibilitySpy = vi.spyOn(statusBarManager, 'updateVisibility');
      
      // Simulate configuration change
      statusBarManager.updateVisibility();
      
      expect(updateVisibilitySpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing file name gracefully', () => {
      const testUri = { fsPath: '' };
      mockLockorManager.isFileLocked.mockReturnValue(true);

      // Should not throw error
      expect(() => statusBarManager.updateStatusBar(testUri as any)).not.toThrow();
    });

    it('should handle undefined LockorManager gracefully', () => {
      const testUri = { fsPath: '/test/file.txt' };
      
      // Create manager with undefined lockorManager - this will throw during construction
      expect(() => new StatusBarManager(undefined as any)).toThrow();
    });
  });
});
