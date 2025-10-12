# Changelog

All notable changes to the Lockor VS Code extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Testing Infrastructure**
  - Comprehensive test suite with unit, integration, and e2e tests (62 tests passing)
  - Test pipeline scripts for local and CI testing
  - Separate e2e test configuration to avoid file system conflicts
  
- **CI/CD Pipeline Enhancements**
  - Sophisticated workflow triggers (push runs tests/lint only, PR merge runs full pipeline)
  - Fast-forward merge enforcement to prevent squash commit validation failures
  - PR squash commit message validation
  - PR title format checking with sticky comments
  - Automated dependency updates with security scanning
  - Configurable branch flow system with environment variables
  - Change detection for optimized workflow execution
  
- **Extension Features**
  - Auto-locking of generated files (`.lockor`, `.cursor/rules/lockor.mdc`) to prevent AI modification
  - Enhanced API commands with better formatting and reduced duplication
  
- **Packaging & Assets**
  - Marketing assets and improved packaging
  - Missing marketplace fields for better VS Code marketplace integration
  - Optimized icon packaging and dock icons
  - Logo and visual assets for better branding

### Changed
- **CI/CD Workflow Optimization**
  - Reorganized workflow files with category prefixes (job.*, pipe.yml)
  - Removed duplicative test runs from push events
  - Improved workflow triggers to run tests/lint on push, full pipeline on PR merge
  - Enhanced error handling and conditional job execution
  
- **Testing & Development**
  - Reorganized test structure for better maintainability
  - Enhanced test coverage and reliability
  - Improved deploy script to use pnpm instead of npm
  - Better version handling and deployment process
  
- **User Experience**
  - Updated keyboard shortcuts (Cmd+Shift+L → Cmd+K Cmd+L) to avoid conflicts
  - Improved status bar behavior and icon visibility

### Fixed
- **Critical Bug Fixes**
  - `.lockor` file now uses relative paths instead of absolute paths for git sharing compatibility
  - Resolved all test failures and improved test coverage
  - Fixed TypeScript compilation errors
  - Restored blue linting warnings for locked files
  
- **CI/CD Pipeline Fixes**
  - Fixed empty `inputs.all_branches` causing `fromJson` errors in versioning job
  - Removed duplicative workflow triggers causing multiple test runs
  - Fixed PR number suffix in squash commit message validation
  - Fixed workflow permissions and duplicate cron schedules
  - Resolved CI/CD pipeline permission issues
  - Fixed version tagging and release process
  
- **Extension Fixes**
  - Fixed status bar lock/unlock icon visibility issues
  - Corrected gallery banner colors for better branding
  - Fixed deploy script version detection and tag creation
  - Improved file system handling in tests
  - Fixed notification spam and save blocking debugging
  - Resolved hard mode conflict resolution for file markers
  - Improved API command formatting and removed duplication

### Technical Details
- **Workflow Strategy**: Push to branches triggers tests and lint only; PR merge triggers full CI/CD pipeline (tests, lint, build, versioning, tagging, publishing)
- **Test Coverage**: 62 tests passing, 14 e2e tests (manually skipped for production)
- **Path Portability**: All generated files now use workspace-relative paths for cross-platform compatibility

## [0.2.0] - 2024-09-05

### Fixed
- Added contents: write permission for tag creation in CI/CD pipeline
- Fixed exit code 128 error in tag creation process
- Improved GitHub Actions workflow permissions

## [0.1.14] - 2024-09-05

### Fixed
- Corrected gallery banner color back to green #277970
- Reverted previous incorrect color change for better branding consistency

## [0.1.13] - 2024-09-05

### Fixed
- Updated gallery banner background color to #20272F
- Improved visual consistency with dark theme

## [0.1.12] - 2024-09-05

### Fixed
- Enabled proper release-it version detection
- Improved deploy script reliability

## [0.1.11] - 2024-09-05

### Fixed
- Restructured deploy script to tag only after successful publishing
- Improved version handling and deployment process

## [0.1.0] - 2024-09-05

### Added
- Initial release of Lockor VS Code extension
- File locking and unlocking functionality
- Three protection levels: Soft, AI-Aware, and Hard
- Language-aware file markers with appropriate comment syntax
- `.lockor` YAML status file generation
- Cursor AI integration with `.cursor/rules/lockor.mdc`
- Status bar indicator with gold warning background
- Workspace diagnostics integration
- Debounced notifications to prevent spam
- Hard mode conflict resolution for file markers
- Multi-layer AI visibility system
- Comprehensive settings and configuration options

### Features
- 🔒 Smart file protection system
- 🤖 AI integration and blocking capabilities  
- 📁 Multiple AI visibility layers
- ⚙️ Advanced configuration options
- 🎯 Protection levels for different use cases
- 📊 Status bar and visual indicators
- 💾 Persistent lock state management
- 🚫 Save prevention and OS-level read-only (Hard mode)
