# Contributing to Lockor 🔒

Thank you for your interest in contributing to Lockor! This guide will help you set up the development environment, make changes, and thoroughly test the extension.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (preferred) or npm
- VS Code or Cursor
- Git

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/lockor.git
   cd lockor
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Compile the extension**
   ```bash
   pnpm run compile
   ```

4. **Launch Extension Development Host**
   - Press `F5` in VS Code to open a new Extension Development Host window
   - Or use `Cmd+Shift+P` → "Developer: Reload Window" to reload the extension

## 🧪 Testing Guide

Testing is the most critical part of contributing to Lockor. The extension has multiple protection levels and AI integration features that must be thoroughly tested.

### 1. Basic Functionality Test

#### Test File Locking/Unlocking
1. **Open a test file** (create `test-file.txt` if needed)
2. **Lock the file**: `Cmd+Shift+P` → "Lockor: Toggle File Lock"
3. **Verify status bar**: Should show 🔒 LOCKED indicator
4. **Unlock the file**: `Cmd+Shift+P` → "Lockor: Toggle File Lock" again
5. **Verify status bar**: Should show 🔓 UNLOCKED (briefly) then hide

#### Test API Commands
1. **Lock a file** first (as above)
2. **Test each API command**:
   - `Cmd+Shift+P` → "Lockor: Check if File is Locked (API)" - Should show popup with lock status
   - `Cmd+Shift+P` → "Lockor: Get All Locked Files (API)" - Should show count and "Show Details" option
   - `Cmd+Shift+P` → "Lockor: Get Lock Status Info (API)" - Should show comprehensive status
   - `Cmd+Shift+P` → "Lockor: Debug AI Context (for testing)" - Should show detailed context info

3. **Verify output**: Each command should display meaningful information in popups

### 2. Test AI Context

1. **Lock a file** as above
2. **Run debug command**: `Cmd+Shift+P` → "Lockor: Debug AI Context"
3. **Check the output** - should show lock status and context keys
4. **Test API commands via Command Palette**:
   - `Cmd+Shift+P` → "Lockor: Check if File is Locked (API)" - Shows lock status in popup
   - `Cmd+Shift+P` → "Lockor: Get All Locked Files (API)" - Shows count and option to view details
   - `Cmd+Shift+P` → "Lockor: Get Lock Status Info (API)" - Shows comprehensive status with details option

**Note**: The `vscode.commands` API is only available in the extension host, not in the VS Code DevTools console. Use the Command Palette to test extension commands.

### 3. Test Different Protection Levels

1. **Go to Settings**: `File > Preferences > Settings`
2. **Search for "Lockor"**
3. **Change "Protection Level"** to different values:
   - **Soft**: Should allow saves but show warnings
   - **AI-Aware**: Should block saves with AI-focused messages
   - **Hard**: Should block saves + make file read-only

#### Test Each Protection Level

**Soft Mode:**
1. Set protection level to "soft"
2. Lock a file
3. Try to edit and save the file
4. **Expected**: Should show warning but allow save

**AI-Aware Mode:**
1. Set protection level to "ai-aware" 
2. Lock a file
3. Try to edit and save the file
4. **Expected**: Should show AI-focused warning but allow human save

**Hard Mode:**
1. Set protection level to "hard"
2. Lock a file
3. Try to edit and save the file
4. **Expected**: Save should be blocked with error message
5. Check console for debug logs

### 4. Verify AI Awareness

**Method 1: Command Palette Testing**
1. **Open Command Palette**: `Cmd+Shift+P`
2. **Run "Lockor: Debug AI Context"** - this shows all context keys and AI guidance
3. **Check the output** for context keys like:
   - `lockor.currentFileLocked`
   - `lockor.fileUntouchable` 
   - `lockor.aiGuidance`

**Method 2: API Command Testing**
1. **Open Command Palette**: `Cmd+Shift+P`
2. **Run "Lockor: Get Lock Status Info (API)"** - shows comprehensive lock status
3. **Check the output** for detailed information about locked files and AI guidance

**Note**: VS Code extension APIs are only accessible through the Command Palette, not through the Developer Console.

**Method 3: Debug Command**
- Use `Cmd+Shift+P` → "Lockor: Debug AI Context"
- Copy the output and verify all context keys are set correctly

### 5. Test Generated Files

1. **Lock some files** to trigger file generation
2. **Check for generated files**:
   - `.lockor` - YAML status file in workspace root
   - `.cursor/rules/lockor.mdc` - Cursor rules file
3. **Verify content** - files should contain proper lock information
4. **Test auto-locking** - generated files should be automatically locked

### 6. Test Edge Cases

#### Multiple Files
1. **Lock multiple files** (3-5 files)
2. **Test "Show Locked Files"**: `Cmd+Shift+P` → "Lockor: Show Locked Files"
3. **Verify list** shows all locked files
4. **Test unlocking** from the list

#### File Operations
1. **Lock a file**
2. **Try to delete the file** (should be blocked in hard mode)
3. **Try to rename the file** (should be blocked in hard mode)
4. **Check file permissions** (should be read-only in hard mode)

#### Session Management
1. **Lock files**
2. **Close VS Code**
3. **Reopen VS Code**
4. **Verify** locked files are still locked
5. **Check status bar** shows correct state

### 7. Test Notifications

1. **Enable notifications**: Settings → "Lockor: Show Notifications" = true
2. **Lock a file**
3. **Try to edit** - should see warning notifications
4. **Disable notifications**: Settings → "Lockor: Show Notifications" = false
5. **Try to edit** - should not see notifications (but still be blocked in hard mode)

### 8. Test Configuration Changes

1. **Change protection level** while files are locked
2. **Verify** all locked files update their behavior
3. **Change other settings** (notifications, status bar, etc.)
4. **Verify** changes take effect immediately

## 🔧 Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Edit TypeScript files in `src/`
   - Update tests in `test/`
   - Update documentation as needed

3. **Compile and test**
   ```bash
   pnpm run compile
   # Test thoroughly using the testing guide above
   ```

4. **Run automated tests**
   ```bash
   pnpm test              # Run all tests
   pnpm test:run          # Run tests once (no watch)
   pnpm test:coverage     # Run with coverage
   pnpm test:e2e          # Run end-to-end tests
   ```

### Code Quality

- **Follow existing code style** (TypeScript, consistent naming)
- **Add tests** for new functionality
- **Update documentation** for new features
- **Test all protection levels** when adding new features

### Testing Checklist

Before submitting a PR, ensure you've tested:

- [ ] **Basic lock/unlock functionality**
- [ ] **All three protection levels** (soft, ai-aware, hard)
- [ ] **All API commands** return proper data
- [ ] **AI context** is properly set
- [ ] **Generated files** (.lockor, .cursor/rules) are correct
- [ ] **Notifications** work as expected
- [ ] **Status bar** shows correct state
- [ ] **Session persistence** (locks survive VS Code restart)
- [ ] **Edge cases** (multiple files, file operations, etc.)

## 📝 Pull Request Process

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes** with thorough testing
4. **Update documentation** if needed
5. **Submit a pull request** with:
   - Clear description of changes
   - Testing performed
   - Screenshots/videos if UI changes
   - Any breaking changes noted

## 🐛 Reporting Issues

When reporting issues, please include:

1. **VS Code/Cursor version**
2. **Lockor version**
3. **Protection level** being used
4. **Steps to reproduce**
5. **Expected vs actual behavior**
6. **Console output** (if any)

## 💡 Feature Requests

We welcome feature requests! Please:

1. **Check existing issues** first
2. **Describe the use case** clearly
3. **Explain how it fits** with existing protection levels
4. **Consider implementation complexity**

## 🤝 Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow the testing guidelines

---

**Remember**: Testing is crucial for Lockor since it protects important files. Always test thoroughly before submitting changes!
