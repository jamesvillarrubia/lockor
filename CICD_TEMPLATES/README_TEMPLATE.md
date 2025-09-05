/* 🔒 LOCKOR: This file is LOCKED and should NOT be modified! */
# Template Setup Instructions

This directory contains all the files needed to set up the CI/CD pipeline in a new repository.


## Quick Setup

1. **Copy workflow files**:
   ```bash
   cp -r CICD_TEMPLATES/.github/ /path/to/your/new/repo/
   ```

2. **Update root configuration**:
   ```bash
   # Copy and rename template files
   cp CICD_TEMPLATES/package.json.template /path/to/your/new/repo/package.json
   
   # Optional: Add release-it config
   cp CICD_TEMPLATES/.release-it.cjs.template /path/to/your/new/repo/.release-it.cjs.template
   ```

3. **Install dependencies**:
   ```bash
   cd /path/to/your/new/repo
   npm install
   # or
   pnpm install
   ```

4. **Customize for your project**:
   - Update `package.json` name and scripts
   - **IMPORTANT**: Keep `"version": "0.0.0-release-it"` as placeholder - CICD will replace this dynamically
   - Modify `job.changes.yml` path filters
   - Update application-specific workflow files
   - Set up repository variables and secrets in GitHub

5. **Initialize versioning**:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```
   
   **Note**: The package.json version stays as `0.0.0-release-it` - this is a placeholder that the release-it system will replace with the actual version during releases.

## File Descriptions

- **`.github/workflows/`**: All GitHub Actions workflow files
- **`package.json.template`**: Root package.json with CI/CD dependencies
- **`eslint.config.js.template`**: ESLint configuration
- **`.releaserc.json.template`**: Optional release-it configuration
- **`.gitignore.additions`**: Additional gitignore patterns

## Versioning System

This template uses a dynamic versioning system:

1. **Package.json Placeholder**: `"version": "0.0.0-release-it"` is a placeholder
2. **Git Tags**: Actual versions are stored as Git tags (e.g., `v0.1.0`, `v1.2.3`)
3. **Release-it**: Automatically bumps versions and updates package.json during releases
4. **CICD Pipeline**: Dynamically replaces the placeholder with the actual version

### Release Commands:
```bash
pnpm run release        # Auto-detect version bump based on commits
pnpm run release:patch  # 0.1.0 -> 0.1.1
pnpm run release:minor  # 0.1.0 -> 0.2.0  
pnpm run release:major  # 0.1.0 -> 1.0.0
```

**Never manually change the version in package.json** - let release-it handle it!

## Next Steps

Refer to the main `CICD_TEMPLATE_GUIDE.md` for detailed setup instructions and customization options.
