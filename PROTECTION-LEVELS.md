# Lockor Protection Levels Guide

This guide explains the differences between Lockor's three protection levels and helps you choose the right one for your needs.

## Quick Comparison Chart

| Feature | **Soft** | **AI-Aware** (Default) | **Hard** |
|---------|----------|-------------------------|----------|
| **AI Context/Rules** | ✅ Basic signals | ✅ Strong blocking rules | ✅ Strong blocking rules |
| **AI Can Modify** | 🟡 Discouraged | ❌ Blocked | ❌ Blocked |
| **User Can Edit** | ✅ Yes | ✅ Yes (after unlock) | ❌ No (read-only) |
| **User Can Save** | ✅ Yes (with warning) | ❌ No (must unlock) | ❌ No (must unlock) |
| **OS Read-Only** | ❌ No | ❌ No | ✅ Yes |
| **External Tools** | ✅ Can modify | ✅ Can modify | ❌ Blocked (read-only) |
| **Git/Linters** | ✅ Work normally | ✅ Work normally | ❌ May have issues |

## Detailed Breakdown

### 🟡 Soft Mode
**Best for:** Light AI protection with maximum flexibility

**What happens when file is locked:**
- ✅ **AI gets basic context** - told to avoid the file
- ✅ **User can edit freely** - no restrictions
- ✅ **User can save freely** - just shows a warning
- ✅ **External tools work** - git, linters, formatters all work
- ✅ **No file system changes** - file permissions unchanged

**Use this when:**
- You want AI to avoid files but don't want any restrictions
- You're working with files that need frequent external tool access
- You want maximum flexibility with minimal protection

### 🎯 AI-Aware Mode (Recommended)
**Best for:** Blocking AI while maintaining user control

**What happens when file is locked:**
- ✅ **AI gets strong blocking rules** - explicitly told not to modify
- ✅ **User can edit after unlock** - must unlock first, then can edit freely
- ❌ **User cannot save while locked** - save operations are blocked
- ✅ **External tools work** - git, linters, formatters all work
- ✅ **No file system changes** - file permissions unchanged

**Use this when:**
- You want to prevent AI modifications (primary use case)
- You want to maintain control over when you can edit
- You need external tools to work normally
- You want a balance of protection and usability

### 🔒 Hard Mode
**Best for:** Maximum protection from all sources

**What happens when file is locked:**
- ✅ **AI gets strong blocking rules** - explicitly told not to modify
- ❌ **User cannot edit** - file becomes read-only at OS level
- ❌ **User cannot save while locked** - save operations are blocked
- ❌ **External tools may fail** - many tools can't modify read-only files
- ✅ **OS-level protection** - file permissions set to read-only

**Use this when:**
- You need absolute protection from all modification attempts
- You're protecting critical configuration files
- You don't need external tools to modify the files
- You want maximum security

## Common Scenarios

### Scenario 1: "I want AI to leave my config files alone"
**Recommended:** `ai-aware`
- AI will be blocked from modifying
- You can still edit when needed (after unlock)
- Tools like git and linters still work

### Scenario 2: "I want to protect critical files from everything"
**Recommended:** `hard`
- Complete protection from all sources
- Files become truly read-only
- Maximum security

### Scenario 3: "I want minimal restrictions but AI awareness"
**Recommended:** `soft`
- AI gets context but isn't strictly blocked
- No restrictions on user or tools
- Just warnings and context

## Switching Between Levels

When you change protection levels in VS Code settings:
- ✅ **Existing locked files automatically update** to new protection level
- ✅ **File permissions change immediately** (for hard mode)
- ✅ **AI rules update** with new protection level
- ✅ **Notification shows** how many files were affected

## Technical Details

### What "AI Context/Rules" Means:
- Creates `.cursor/rules/lockor.mdc` with file-specific rules
- Updates `LOCKOR_STATUS.md` in workspace root
- Adds VS Code diagnostics to Problems panel
- Optionally adds visible comments to files (if enabled)

### What "Save Prevention" Means:
- Intercepts VS Code's `onWillSaveTextDocument` event
- Blocks the save operation with an error
- Shows unlock options to user
- Only affects saves through VS Code/Cursor

### What "OS Read-Only" Means:
- Changes file permissions at filesystem level
- Removes write permissions for user/group/others
- Affects all applications, not just VS Code
- Can cause issues with some development tools

## Troubleshooting

**Q: I changed to hard mode and my linter stopped working**
A: Hard mode makes files read-only at OS level. Switch to `ai-aware` mode for tool compatibility.

**Q: AI is still modifying my files in soft mode**
A: Soft mode only discourages AI, it doesn't strictly block. Use `ai-aware` for strict blocking.

**Q: I can't edit my file after locking**
A: If in `ai-aware` or `hard` mode, unlock the file first with `Cmd+Shift+L` or unlock command.

**Q: My files didn't update when I changed protection levels**
A: This should happen automatically. If not, try unlocking and re-locking the files.
