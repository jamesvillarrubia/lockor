# Scripts Directory

This directory contains utility scripts for the Lockor VS Code extension project.

## Pipeline Testing Scripts

### `test-pipeline.sh`

A comprehensive script to test the CI/CD pipeline by making a small, repeatable change to the extension source code.

**Usage:**
```bash
# Make change and show next steps
./scripts/test-pipeline.sh

# See what would happen without making changes
./scripts/test-pipeline.sh --dry-run

# Make change and automatically commit/push
./scripts/test-pipeline.sh --commit

# Show help
./scripts/test-pipeline.sh --help
```

**What it does:**
- Makes a small, non-functional change to `src/extension.ts` (adds/updates a test comment)
- The change is designed to trigger the CI/CD pipeline because it modifies extension source files
- Optionally commits and pushes the change to trigger the pipeline
- Safe to run multiple times (updates existing test comment)

### `quick-test.sh`

A simplified version for quick pipeline testing.

**Usage:**
```bash
./scripts/quick-test.sh
```

**What it does:**
- Makes a test change to `src/extension.ts`
- Automatically commits and pushes the change
- Triggers the CI/CD pipeline immediately

## Deployment Scripts

### `deploy.sh`

Local deployment script that mirrors the GitHub Actions CI/CD pipeline.

**Usage:**
```bash
# Deploy using release-it to determine version
./scripts/deploy.sh

# See what would happen
./scripts/deploy.sh --dry-run

# Package only, don't publish
./scripts/deploy.sh --skip-publish
```

## Pipeline Testing Workflow

To test the full CI/CD pipeline:

1. **Ensure you're on the right branch:**
   ```bash
   git checkout develop  # or main
   ```

2. **Run the test script:**
   ```bash
   # Quick test (automatically commits and pushes)
   ./scripts/quick-test.sh
   
   # Or use the full script with options
   ./scripts/test-pipeline.sh --commit
   ```

3. **Monitor the pipeline:**
   - Go to GitHub Actions in your repository
   - Watch the "CI/CD Pipeline" workflow
   - The pipeline should run: changes → lint → build → version → tag → publish

4. **Verify the results:**
   - Check that the extension was packaged
   - Verify it was published to Open VSX Registry
   - Confirm a GitHub release was created

## Pipeline Change Detection

The CI/CD pipeline detects changes in these file patterns:

- **Extension changes** (triggers full pipeline):
  - `src/**` - Source code files
  - `package.json` - Package configuration
  - `tsconfig.json` - TypeScript configuration
  - `*.md` - Documentation files

- **CI/CD changes** (triggers versioning and publishing):
  - `.github/workflows/**` - GitHub Actions workflows
  - `.release-it.cjs` - Release configuration
  - `.releaserc.json` - Release configuration

## Requirements

- Git repository with proper remote setup
- Currently on `develop` or `main` branch
- Git configured with user name and email
- For deployment: `OVSX_PAT` environment variable or token file
