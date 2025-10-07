# Changelog

All notable changes to the Lockor VS Code extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive test suite with unit, integration, and e2e tests (62 tests passing)
- GitHub Actions CI/CD pipeline with automated testing
- Auto-locking of generated files to prevent AI modification
- Enhanced API commands with better formatting and reduced duplication
- Test pipeline scripts for local and CI testing
- Marketing assets and improved packaging
- Missing marketplace fields for better VS Code marketplace integration
- Optimized icon packaging and dock icons
- Logo and visual assets for better branding

### Changed
- Reorganized test structure for better maintainability
- Improved CI workflow organization with category prefixes
- Enhanced test coverage and reliability
- Updated keyboard shortcuts to avoid conflicts
- Improved deploy script to use pnpm instead of npm
- Better version handling and deployment process
- Status bar behavior improvements

### Fixed
- Resolved all test failures and improved test coverage
- Fixed TypeScript compilation errors
- Restored blue linting warnings for locked files
- Separated e2e tests from coverage to avoid file system conflicts
- Fixed workflow permissions and duplicate cron schedules
- Improved API command formatting and removed duplication
- Fixed status bar lock/unlock icon visibility issues
- Corrected gallery banner colors for better branding
- Fixed deploy script version detection and tag creation
- Resolved CI/CD pipeline permission issues
- Fixed version tagging and release process
- Improved file system handling in tests
- Fixed notification spam and save blocking debugging
- Resolved hard mode conflict resolution for file markers
- Fixed GitHub Actions workflow to handle PR number suffix in squash commits
- Eliminated duplicative test execution in CI/CD pipeline
- Optimized workflow triggers to prevent unnecessary full pipeline runs

### Technical Improvements
- Enhanced CI/CD pipeline with better error handling
- Improved GitHub Actions workflow organization
- Better test coverage with comprehensive test suite
- Enhanced file protection system with auto-locking
- Improved API command structure and formatting
- Better error handling and user feedback
- Enhanced workspace diagnostics integration

### CI/CD Workflow Enhancements
- Implemented sophisticated workflow triggers to eliminate duplication
- Push to branch now runs tests + lint only (no full pipeline)
- Full pipeline only runs on PR merge events
- PR title validation runs on PR open/sync events
- Squash commit validation runs on PR merge events
- Added comprehensive workflow documentation (WORKFLOW_STRUCTURE.md)
- Optimized CI resource usage with targeted execution
- Reduced workflow execution time by 50%+ through elimination of duplicates

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
