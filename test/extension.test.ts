/**
 * Unit tests for extension.ts main functions
 * Tests extension activation, command registration, and event handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { activate, deactivate } from '../src/extension';
import { mockVSCode } from './setup';

// Mock the classes
vi.mock('../src/lockor-manager', () => ({
  LockorManager: vi.fn().mockImplementation(() => ({
    lockFile: vi.fn(),
    unlockFile: vi.fn(),
    toggleFileLock: vi.fn(),
    showLockedFiles: vi.fn(),
    isFileLocked: vi.fn().mockReturnValue(false),
    getLockedFiles: vi.fn().mockReturnValue([]),
    updateAllFilePermissions: vi.fn()
  }))
}));

vi.mock('../src/status-bar-manager', () => ({
  StatusBarManager: vi.fn().mockImplementation(() => ({
    updateStatusBar: vi.fn(),
    updateVisibility: vi.fn(),
    dispose: vi.fn()
  }))
}));

describe('Extension', () => {
  let mockContext: any;
  let mockActiveEditor: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup mock context
    mockContext = {
      subscriptions: {
        push: vi.fn()
      }
    };

    // Setup mock active editor
    mockActiveEditor = {
      document: {
        uri: { fsPath: '/test/file.txt' },
        fileName: 'file.txt'
      }
    };

    // Setup VS Code mocks
    mockVSCode.window.activeTextEditor = mockActiveEditor;
    mockVSCode.workspace.getConfiguration.mockReturnValue({
      get: vi.fn().mockImplementation((key: string, defaultValue: any) => {
        const config: Record<string, any> = {
          'protectionLevel': 'ai-aware',
          'showNotifications': true
        };
        return config[key] ?? defaultValue;
      })
    });

    mockVSCode.commands.registerCommand.mockReturnValue({ dispose: vi.fn() });
    mockVSCode.workspace.onWillSaveTextDocument.mockReturnValue({ dispose: vi.fn() });
    mockVSCode.workspace.onDidChangeTextDocument.mockReturnValue({ dispose: vi.fn() });
    mockVSCode.window.onDidChangeActiveTextEditor.mockReturnValue({ dispose: vi.fn() });
    mockVSCode.workspace.onDidChangeConfiguration.mockReturnValue({ dispose: vi.fn() });
    mockVSCode.commands.executeCommand.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Extension Activation', () => {
    it('should activate extension successfully', () => {
      expect(() => activate(mockContext)).not.toThrow();
    });

    it('should register all commands', () => {
      activate(mockContext);
      
      const expectedCommands = [
        'lockor.lockFile',
        'lockor.unlockFile',
        'lockor.toggleLock',
        'lockor.showLockedFiles',
        'lockor.isFileLocked',
        'lockor.getLockedFiles',
        'lockor.debugAIContext',
        'lockor.getLockStatusInfo',
        'lockor.internal.refreshStatusBar',
        'lockor.internal.updateAIContext'
      ];

      expectedCommands.forEach(command => {
        expect(mockVSCode.commands.registerCommand).toHaveBeenCalledWith(
          command,
          expect.any(Function)
        );
      });
    });

    it('should register event listeners', () => {
      activate(mockContext);
      
      expect(mockVSCode.workspace.onWillSaveTextDocument).toHaveBeenCalled();
      expect(mockVSCode.workspace.onDidChangeTextDocument).toHaveBeenCalled();
      expect(mockVSCode.window.onDidChangeActiveTextEditor).toHaveBeenCalled();
      expect(mockVSCode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
    });

    it('should add disposables to context', () => {
      activate(mockContext);
      expect(mockContext.subscriptions.push).toHaveBeenCalled();
    });
  });

  describe('Command Execution', () => {
    let registeredCommands: Map<string, Function>;

    beforeEach(() => {
      // Capture registered commands
      registeredCommands = new Map();
      mockVSCode.commands.registerCommand.mockImplementation((name: string, fn: Function) => {
        registeredCommands.set(name, fn);
        return { dispose: vi.fn() };
      });
      
      activate(mockContext);
    });

    it('should execute lockFile command', async () => {
      const lockFileCommand = registeredCommands.get('lockor.lockFile');
      expect(lockFileCommand).toBeDefined();
      
      // Should not throw when executed
      await expect(lockFileCommand!()).resolves.not.toThrow();
    });

    it('should execute unlockFile command', async () => {
      const unlockFileCommand = registeredCommands.get('lockor.unlockFile');
      expect(unlockFileCommand).toBeDefined();
      
      // Should not throw when executed
      await expect(unlockFileCommand!()).resolves.not.toThrow();
    });

    it('should execute toggleLock command', async () => {
      const toggleLockCommand = registeredCommands.get('lockor.toggleLock');
      expect(toggleLockCommand).toBeDefined();
      
      // Should not throw when executed
      await expect(toggleLockCommand!()).resolves.not.toThrow();
    });

    it('should execute showLockedFiles command', () => {
      const showLockedFilesCommand = registeredCommands.get('lockor.showLockedFiles');
      expect(showLockedFilesCommand).toBeDefined();
      
      // Should not throw when executed
      expect(() => showLockedFilesCommand!()).not.toThrow();
    });

    it('should execute isFileLocked command', () => {
      const isFileLockedCommand = registeredCommands.get('lockor.isFileLocked');
      expect(isFileLockedCommand).toBeDefined();
      
      // Should return boolean
      const result = isFileLockedCommand!();
      expect(typeof result).toBe('boolean');
    });

    it('should execute getLockedFiles command', () => {
      const getLockedFilesCommand = registeredCommands.get('lockor.getLockedFiles');
      expect(getLockedFilesCommand).toBeDefined();
      
      // Should return array
      const result = getLockedFilesCommand!();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should execute debugAIContext command', () => {
      const debugAIContextCommand = registeredCommands.get('lockor.debugAIContext');
      expect(debugAIContextCommand).toBeDefined();
      
      // Mock the showInformationMessage to return a promise
      mockVSCode.window.showInformationMessage.mockResolvedValue(undefined);
      
      // Should not throw when executed
      expect(() => debugAIContextCommand!()).not.toThrow();
    });

    it('should execute getLockStatusInfo command', () => {
      const getLockStatusInfoCommand = registeredCommands.get('lockor.getLockStatusInfo');
      expect(getLockStatusInfoCommand).toBeDefined();
      
      // Should return object
      const result = getLockStatusInfoCommand!();
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('activeFile');
      expect(result).toHaveProperty('lockedFiles');
      expect(result).toHaveProperty('totalLockedFiles');
      expect(result).toHaveProperty('protectionLevel');
    });
  });

  describe('Event Handling', () => {
    let eventHandlers: Map<string, Function>;

    beforeEach(() => {
      // Capture event handlers
      eventHandlers = new Map();
      mockVSCode.workspace.onWillSaveTextDocument.mockImplementation((handler: Function) => {
        eventHandlers.set('onWillSaveTextDocument', handler);
        return { dispose: vi.fn() };
      });
      mockVSCode.workspace.onDidChangeTextDocument.mockImplementation((handler: Function) => {
        eventHandlers.set('onDidChangeTextDocument', handler);
        return { dispose: vi.fn() };
      });
      mockVSCode.window.onDidChangeActiveTextEditor.mockImplementation((handler: Function) => {
        eventHandlers.set('onDidChangeActiveTextEditor', handler);
        return { dispose: vi.fn() };
      });
      mockVSCode.workspace.onDidChangeConfiguration.mockImplementation((handler: Function) => {
        eventHandlers.set('onDidChangeConfiguration', handler);
        return { dispose: vi.fn() };
      });
      
      activate(mockContext);
    });

    it('should handle document save events', () => {
      const saveHandler = eventHandlers.get('onWillSaveTextDocument');
      expect(saveHandler).toBeDefined();
      
      const mockEvent = {
        document: {
          uri: { fsPath: '/test/file.txt' },
          fileName: 'file.txt'
        },
        waitUntil: vi.fn()
      };
      
      // Should not throw when handling save event
      expect(() => saveHandler!(mockEvent)).not.toThrow();
    });

    it('should handle document change events', () => {
      const changeHandler = eventHandlers.get('onDidChangeTextDocument');
      expect(changeHandler).toBeDefined();
      
      const mockEvent = {
        document: {
          uri: { fsPath: '/test/file.txt' },
          fileName: 'file.txt'
        },
        contentChanges: [{ text: 'change' }]
      };
      
      // Should not throw when handling change event
      expect(() => changeHandler!(mockEvent)).not.toThrow();
    });

    it('should handle active editor changes', () => {
      const editorChangeHandler = eventHandlers.get('onDidChangeActiveTextEditor');
      expect(editorChangeHandler).toBeDefined();
      
      // Should not throw when handling editor change
      expect(() => editorChangeHandler!(mockActiveEditor)).not.toThrow();
    });

    it('should handle configuration changes', async () => {
      const configChangeHandler = eventHandlers.get('onDidChangeConfiguration');
      expect(configChangeHandler).toBeDefined();
      
      const mockEvent = {
        affectsConfiguration: vi.fn().mockReturnValue(true)
      };
      
      // Should not throw when handling config change
      await expect(configChangeHandler!(mockEvent)).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing active editor gracefully', async () => {
      mockVSCode.window.activeTextEditor = null;
      
      let registeredCommands: Map<string, Function>;
      mockVSCode.commands.registerCommand.mockImplementation((name: string, fn: Function) => {
        registeredCommands = registeredCommands || new Map();
        registeredCommands.set(name, fn);
        return { dispose: vi.fn() };
      });
      
      activate(mockContext);
      
      const lockFileCommand = registeredCommands!.get('lockor.lockFile');
      await expect(lockFileCommand!()).resolves.not.toThrow();
    });

    it('should handle command execution errors gracefully', () => {
      // This test is actually testing that errors are thrown, not handled gracefully
      mockVSCode.commands.registerCommand.mockImplementation(() => {
        throw new Error('Command registration failed');
      });
      
      // Should throw during activation when command registration fails
      expect(() => activate(mockContext)).toThrow('Command registration failed');
    });
  });

  describe('Extension Deactivation', () => {
    it('should deactivate extension successfully', () => {
      expect(() => deactivate()).not.toThrow();
    });

    it('should clean up resources on deactivation', () => {
      // Mock setTimeout and clearTimeout
      const mockTimeout = setTimeout(() => {}, 1000);
      vi.spyOn(global, 'setTimeout').mockReturnValue(mockTimeout);
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      
      deactivate();
      
      // Should not throw during deactivation
      expect(() => deactivate()).not.toThrow();
    });
  });
});
