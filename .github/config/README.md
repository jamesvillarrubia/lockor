# Workflow Scripts

This directory contains utility scripts for managing GitHub Actions workflows and configuration.

## 🔧 GitHub Configuration Sync (`sync-github-config.sh`)

Manages GitHub repository secrets and variables from a YAML configuration file, eliminating the need to manually update them through the web console.

### Prerequisites

```bash
# Install GitHub CLI
brew install gh

# Install yq (YAML processor)  
brew install yq

# Authenticate with GitHub
gh auth login
```

### Quick Start

1. **Initialize configuration**:
   ```bash
   cd .github/workflows/scripts
   ./sync-github-config.sh init
   ```

2. **Edit the configuration** (`github-config.yml`):
   ```yaml
   secrets:
     OVSX_PAT:
       value: "your_actual_token_here"
       description: "Open VSX Personal Access Token"
       required: true
   ```

3. **Validate and sync**:
   ```bash
   ./sync-github-config.sh validate
   ./sync-github-config.sh sync
   ```

### Commands

| Command | Purpose |
|---------|---------|
| `init` | Create template YAML config file |
| `sync` | Upload configuration to GitHub |
| `validate` | Check YAML format and required secrets |
| `show` | Display configuration summary |
| `list` | List current GitHub secrets/variables |
| `help` | Show detailed help |

### Configuration Format

The YAML configuration supports:

- **Metadata**: Repository info and documentation
- **Secrets**: Encrypted values (API tokens, passwords)
- **Variables**: Plain text environment variables
- **Descriptions**: Documentation for each setting
- **Required flags**: Mark critical secrets as required

### Security

- ✅ Configuration file is excluded from git (`.gitignore`)
- ✅ Secrets are encrypted in GitHub
- ✅ Variables are plain text (for non-sensitive data)
- ✅ Validation checks for placeholder values

### Example Usage

```bash
# Check current GitHub configuration
./sync-github-config.sh list

# Show local configuration summary
./sync-github-config.sh show

# Sync all changes to GitHub
./sync-github-config.sh sync
```

This approach provides:
- **Version control** for your CI/CD configuration
- **Documentation** with descriptions and metadata
- **Validation** to catch configuration errors
- **Automation** to eliminate manual web console updates

---

*Keep your CI/CD configuration organized and version-controlled!* 🎯
