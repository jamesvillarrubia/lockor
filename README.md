# Lockor 🔒

**Lockor** (cursOR + LOCKer) is a simple VS Code and Cursor extension that prevents certain files from being modified. Perfect for protecting configuration files, templates, or any files you want to keep unchanged during development.

## Features

- 🔒 **Lock/Unlock Files**: Easily lock files to prevent accidental modifications
- 🚫 **Save Prevention**: Blocks save operations on locked files
- 📊 **Status Bar Indicator**: Visual indicator showing lock status of current file
- 🎯 **Context Menu Integration**: Right-click any file to toggle its lock status
- ⚙️ **Configurable**: Customize notifications and behavior
- 💾 **Persistent**: Lock states are remembered across VS Code sessions
- 🤖 **AI Integration**: Automatically updates `.cursor/rules` to inform AI tools

## Usage

### Locking Files

1. **From Editor**: Open a file and use `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux), then type "Lockor: Lock File"
2. **From Explorer**: Right-click any file in the explorer and select "Toggle File Lock"
3. **Quick Toggle**: Use the keyboard shortcut `Cmd+Shift+L` (Mac) or `Ctrl+Shift+L` (Windows/Linux)

### Commands

- `Lockor: Lock File` - Lock the currently active file
- `Lockor: Unlock File` - Unlock the currently active file  
- `Lockor: Toggle File Lock` - Toggle lock status of current file
- `Lockor: Show Locked Files` - View and manage all locked files

### Status Bar

The status bar shows:
- 🔒 **Locked** - File is protected (red background)
- 🔓 **Unlocked** - File can be modified (auto-hides after 2 seconds)

## Configuration

Access settings via `File > Preferences > Settings` and search for "Lockor":

```json
{
  "lockor.showStatusBarItem": true,     // Show/hide status bar indicator
  "lockor.showNotifications": true,     // Show lock/unlock notifications
  "lockor.protectionLevel": "ai-aware"  // Protection level: "soft", "ai-aware", or "hard"
}
```

### Protection Levels Comparison:

| Feature | **Soft** | **AI-Aware** (Default) | **Hard** |
|---------|----------|-------------------------|----------|
| **AI Context/Rules** | ✅ Basic signals | ✅ Strong blocking rules | ✅ Strong blocking rules |
| **AI Can Modify** | 🟡 Discouraged | ❌ Blocked | ❌ Blocked |
| **User Can Edit** | ✅ Yes | ✅ Yes (after unlock) | ❌ No (read-only) |
| **Save Prevention** | ❌ No | ✅ Yes | ✅ Yes |
| **Save Warnings** | ✅ Yes | ❌ No (blocked) | ❌ No (blocked) |
| **OS Read-Only** | ❌ No | ❌ No | ✅ Yes |
| **External Tools** | ✅ Can modify | ✅ Can modify | ❌ Blocked |
| **Use Case** | Light protection | AI protection only | Maximum protection |

#### When to Use Each Level:
- **Soft**: You want AI to avoid files but allow easy user/tool access
- **AI-Aware**: You want to block AI but allow user control (recommended)
- **Hard**: You want complete file protection from all sources

## AI Integration

Lockor automatically updates `.cursor/rules` with locked file information, so Cursor AI and other AI tools know which files should not be modified.

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "Lockor"
4. Click Install

### Manual Installation
1. Download the `.vsix` file from releases
2. Open VS Code
3. Run `Extensions: Install from VSIX...` from Command Palette
4. Select the downloaded file

## Development

### Prerequisites
- Node.js 22+
- pnpm

### Setup
```bash
git clone <repository-url>
cd lockor
pnpm install
```

### Build
```bash
pnpm run compile
```

### Package
```bash
pnpm install -g @vscode/vsce
vsce package
```

## How It Works

Lockor works by:
1. **Tracking State**: Maintains a list of locked files in workspace storage
2. **Intercepting Saves**: Uses VS Code's `onWillSaveTextDocument` event to prevent saves
3. **Visual Feedback**: Updates status bar and shows notifications
4. **AI Integration**: Updates `.cursor/rules` to inform AI tools
5. **Persistence**: Saves lock state between sessions using workspace storage

## Limitations

- Locks are workspace-specific (not global across projects)
- Only prevents saves through VS Code/Cursor (external file modifications still possible in soft/ai-aware modes)
- Lock state is stored locally (not shared between team members)

## License

MIT License - see LICENSE file for details
