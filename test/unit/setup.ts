/**
 * Test setup file for Vitest
 * Mocks VS Code API and provides test utilities
 */

import { vi } from 'vitest';

// Mock VS Code API
const mockVSCode = {
  window: {
    showInformationMessage: vi.fn().mockResolvedValue(undefined),
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showQuickPick: vi.fn(),
    createStatusBarItem: vi.fn(),
    activeTextEditor: null,
    onDidChangeActiveTextEditor: vi.fn(),
    showTextDocument: vi.fn()
  },
  workspace: {
    getConfiguration: vi.fn(),
    onDidChangeConfiguration: vi.fn(),
    onWillSaveTextDocument: vi.fn(),
    onDidChangeTextDocument: vi.fn(),
    onDidOpenTextDocument: vi.fn(),
    openTextDocument: vi.fn().mockResolvedValue({}),
    asRelativePath: vi.fn((path: string) => path),
    workspaceFolders: [{
      uri: { fsPath: '/test/workspace' }
    }],
    fs: {
      createDirectory: vi.fn(),
      writeFile: vi.fn(),
      delete: vi.fn()
    }
  },
  commands: {
    registerCommand: vi.fn(),
    executeCommand: vi.fn()
  },
  languages: {
    createDiagnosticCollection: vi.fn().mockReturnValue({
      clear: vi.fn(),
      set: vi.fn(),
      dispose: vi.fn()
    })
  },
  Uri: {
    file: vi.fn((path: string) => ({ fsPath: path, toString: () => path })),
    joinPath: vi.fn((base: any, ...paths: string[]) => ({
      fsPath: [base.fsPath, ...paths].join('/'),
      toString: () => [base.fsPath, ...paths].join('/')
    }))
  },
  Range: vi.fn(),
  Position: vi.fn(),
  Diagnostic: vi.fn(),
  DiagnosticSeverity: {
    Information: 1,
    Warning: 2,
    Error: 3
  },
  StatusBarAlignment: {
    Right: 2
  },
  ViewColumn: {
    One: 1,
    Two: 2,
    Three: 3
  },
  ConfigurationTarget: {
    Workspace: 1
  },
  ThemeColor: vi.fn(),
  WorkspaceEdit: vi.fn(),
  env: {
    clipboard: {
      writeText: vi.fn()
    }
  }
};

// Mock the vscode module
vi.mock('vscode', () => mockVSCode);

// Mock Node.js fs module for file operations
vi.mock('fs', () => ({
  default: {
    stat: vi.fn(),
    chmod: vi.fn(),
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    chmodSync: vi.fn(),
    constants: {
      S_IWUSR: 0o200,
      S_IWGRP: 0o020,
      S_IWOTH: 0o002
    }
  },
  stat: vi.fn(),
  chmod: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  chmodSync: vi.fn(),
  constants: {
    S_IWUSR: 0o200,
    S_IWGRP: 0o020,
    S_IWOTH: 0o002
  }
}));

// Mock path module
vi.mock('path', () => ({
  default: {
    basename: vi.fn((path: string) => path.split('/').pop() || path),
    extname: vi.fn((path: string) => {
      const parts = path.split('.');
      return parts.length > 1 ? '.' + parts.pop() : '';
    }),
    join: vi.fn((...args: string[]) => args.join('/')),
    dirname: vi.fn((path: string) => path.split('/').slice(0, -1).join('/'))
  },
  basename: vi.fn((path: string) => path.split('/').pop() || path),
  extname: vi.fn((path: string) => {
    const parts = path.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
  }),
  join: vi.fn((...args: string[]) => args.join('/')),
  dirname: vi.fn((path: string) => path.split('/').slice(0, -1).join('/'))
}));

// Mock child_process module
vi.mock('child_process', () => ({
  exec: vi.fn()
}));

// Mock the require-based child_process usage
vi.mock('util', () => ({
  promisify: vi.fn((fn: any) => fn)
}));

// Export mock for use in tests
export { mockVSCode };
