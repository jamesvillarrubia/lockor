# Lockor Testing Guide

## Quick Testing Steps

### 1. Test Save Blocking

1. **Press F5** to launch Extension Development Host
2. **Create/open a test file** (e.g., `test.txt`)
3. **Lock the file**: `Cmd+Shift+P` → "Lockor: Toggle File Lock"
4. **Make some changes** to the file
5. **Try to save** (`Cmd+S`)
6. **Expected**: Save should be blocked with error message
7. **Check console** for debug logs

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
2. **Search for "Lockor"`
3. **Change "Protection Level"** to different values:
   - **Soft**: Should allow saves but show warnings
   - **AI-Aware**: Should block saves with AI-focused messages
   - **Hard**: Should block saves + make file read-only

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

## Expected Results by Protection Level

### Soft Mode
- ✅ Saves allowed
- ⚠️ Warning messages shown
- 🤖 AI gets context but `canAIModify: true`

### AI-Aware Mode (Default)
- ❌ Saves blocked
- 🔒 AI-focused error messages
- 🤖 Strong AI context: `canAIModify: false`, `fileUntouchable: true`

### Hard Mode
- ❌ Saves blocked
- 🔒 File becomes read-only at OS level
- 🤖 Maximum protection signals

## Debugging Save Issues

If saves aren't being blocked:

1. **Check console logs** for "Lockor: Attempting to save locked file"
2. **Verify file is actually locked** with debug command
3. **Check protection level** in settings
4. **Verify `preventSave` setting** is enabled

**Console Commands to Debug:**
```javascript
// Check if extension is active
vscode.extensions.getExtension('lockor.lockor')

// Check current settings
vscode.workspace.getConfiguration('lockor').get('preventSave')
vscode.workspace.getConfiguration('lockor').get('protectionLevel')

// Force context update
vscode.commands.executeCommand('lockor.internal.updateAIContext')
```

## AI Integration Verification

To verify AI tools can see the lock status:

1. **Lock a file** in AI-aware mode
2. **Run this in console**:
   ```javascript
   vscode.commands.executeCommand('lockor.getLockStatusInfo').then(info => {
     if (info.activeFile?.canAIModify === false) {
       console.log('✅ AI should respect this lock');
     } else {
       console.log('❌ AI might not see the lock');
     }
   });
   ```

## Troubleshooting

**Save blocking not working:**
- Check if `lockor.preventSave` is `true` in settings
- Verify protection level isn't set to `soft`
- Look for console error messages

**AI not respecting locks:**
- AI tools need to be programmed to check the context keys
- Use the debug command to verify context is being set
- Check if the AI tool supports VS Code context integration

**Settings not clear:**
- New descriptions should show in VS Code settings UI
- Each protection level now has detailed explanations
