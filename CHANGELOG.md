# Changelog

All notable changes to the Lockor VS Code extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Fast-forward merge enforcement GitHub Action to prevent squash commit validation failures
- Comprehensive test suite with unit, integration, and e2e tests (62 tests passing)
- Auto-locking of generated files (`.lockor`, `.cursor/rules/lockor.mdc`) to prevent AI modification
- Enhanced API commands with better formatting and reduced duplication
- Test pipeline scripts for local and CI testing
- Separate e2e test configuration to avoid file system conflicts
- Comprehensive GitHub Actions CI/CD pipeline with automated testing
- PR squash commit message validation
- PR title format checking with sticky comments
- Automated dependency updates with security scanning

### Changed
- Sophisticated workflow triggers: push runs tests/lint only, PR merge runs full pipeline
- Reorganized test structure for better maintainability  
- Improved CI workflow organization with category prefixes (job.*, pipe.yml)
- Enhanced test coverage and reliability
- Better error handling and conditional job execution in workflows

### Fixed
- `.lockor` file now uses relative paths instead of absolute paths for git sharing compatibility
- Fixed empty `inputs.all_branches` causing `fromJson` errors in versioning job
- Removed duplicative workflow triggers causing multiple test runs
- Fixed PR number suffix in squash commit message validation
- Resolved all test failures and improved test coverage
- Fixed TypeScript compilation errors
- Restored blue linting warnings for locked files
- Fixed workflow permissions and duplicate cron schedules
- Improved file system handling in tests

## [0.2.0] - 2024-09-05

### Added
- Configurable branch flow system with environment variables
- Change detection for optimized workflow execution

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
- Automatically push git tags to remote

## [0.1.11] - 2024-09-05

### Fixed
- Restructured deploy script to tag only after successful publishing
- Improved version handling and deployment process

## [0.1.10] - 2024-09-05

### Fixed
- Improved deploy script pnpm usage
- Better error handling in deployment

## [0.1.9] - 2024-09-05

### Changed
- Updated deploy script to use pnpm instead of npm

## [0.1.8] - 2024-09-05

### Added
- Missing marketplace fields for better VS Code marketplace integration
- Optimized icon packaging

## [0.1.7] - 2024-09-05

### Fixed
- Keep unlock icon visible at all times in status bar

## [0.1.6] - 2024-09-05

### Fixed
- Prevent lock icon from disappearing in status bar

## [0.1.5] - 2024-09-05

### Added
- Logo and visual assets for better branding
- Correct dock icon and optimized package

### Changed
- Updated keyboard shortcuts (Cmd+Shift+L → Cmd+K Cmd+L) to avoid conflicts

### Fixed
- Updated README with correct keyboard shortcut

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
