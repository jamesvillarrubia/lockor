# Changelog

All notable changes to the Lockor VS Code extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive test suite with unit, integration, and e2e tests
- GitHub Actions CI/CD pipeline with automated testing
- Auto-locking of generated files to prevent AI modification
- Enhanced API commands with better formatting
- Test pipeline scripts for local and CI testing

### Changed
- Reorganized test structure for better maintainability
- Improved CI workflow organization with category prefixes
- Enhanced test coverage and reliability

### Fixed
- Resolved all test failures and improved test coverage
- Fixed TypeScript compilation errors
- Restored blue linting warnings for locked files
- Separated e2e tests from coverage to avoid file system conflicts
- Fixed workflow permissions and duplicate cron schedules
- Improved API command formatting and removed duplication

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
