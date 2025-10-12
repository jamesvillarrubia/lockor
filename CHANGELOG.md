# Changelog

All notable changes to the Lockor VS Code extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

> All changes since v0.1.14 (commit e4da0ee)

### Added - On Main Branch (16 commits)
- Test pipeline trigger scripts for CI validation (8ddb92e, d799243)
- Marketing assets including screenshots and promotional materials (ecffe69)
- Auto-locking functionality for generated files `.lockor` and `.cursor/rules/lockor.mdc` (b71b14d)
- Automated dependency update workflows with security scanning (408c8f6)
- Comprehensive test suite with unit, integration, and e2e tests - 62 tests passing (319116f, 2281ffb)
- GitHub Actions workflow for automated test suite execution (319116f)
- Test configuration file for e2e tests separate from unit/integration tests (f41737e)
- Enhanced API commands with better formatting to reduce output duplication (961a27f)

### Changed - On Main Branch
- Reorganized test file structure into unit/, integration/, and e2e/ directories (2281ffb)

### Fixed - On Main Branch
- Duplicate cron schedule removed from dependency update workflow (893a7e2)
- TypeScript compilation errors resolved (4847984)
- All unit and integration test failures fixed (8b76312)
- E2e tests separated from coverage collection to avoid file system conflicts (f41737e)
- Diagnostic collection properly shows blue linting warnings for locked files (e09f89f)

### Added - On Feature Branch (11 additional commits)
- Fast-forward merge enforcement GitHub Action to prevent squash commit validation failures (263b1d8, d1beef1)
- PR squash commit message validation workflow (4154aa4)

### Changed - On Feature Branch
- CI/CD workflow triggers: push to branches runs tests/lint only, PR merge runs full pipeline (a03c211, 38b73b5, 82b6e26)

### Fixed - On Feature Branch
- `.lockor` file format changed from absolute to relative paths for cross-platform compatibility (784044a)
- Empty `inputs.all_branches` parameter now defaults to `["main"]` to prevent `fromJson` errors (7172ece)
- Removed duplicative workflow triggers that caused tests to run multiple times (2857d8d)
- PR squash commit validation now strips `(#PR_NUMBER)` suffix from commit messages (4154aa4)

## [0.2.0] - 2024-09-05

> Note: v0.2.0 and v0.1.14 point to the same commit

### Added
- GitHub configuration sync script with environment-specific support
- Comprehensive GitHub Actions pipeline with Open VSX publishing capability
- Configurable branch flow system with environment variables for CI/CD
- Change detection workflow to optimize CI/CD execution
- Security scanning with CodeQL integration

### Changed
- Reorganized CI workflow files with category prefixes (job.* naming)
- Implemented positional branch system for flexible CI/CD workflows
- Optimized GitHub Actions by adopting enhanced workflow patterns

### Fixed
- Added `contents: write` permission for git tag creation in CI/CD pipeline
- Fixed exit code 128 error during tag creation process
- CI/CD versioning issues resolved by aligning package.json with git tags
- Node.js upgraded to v20 for better compatibility
- Repository field added to package.json for vsce packaging
- Workflow permissions configured correctly for main pipeline
- `workflow_call` triggers added to all reusable workflows

## [0.1.14] - 2024-09-05

### Fixed
- Gallery banner color corrected back to green (#277970) for brand consistency

## [0.1.13] - 2024-09-05

### Changed
- Gallery banner background color updated to #20272F for visual consistency

### Fixed
- Automatically push git tags to remote after successful publishing

## [0.1.12] - 2024-09-05

### Fixed
- Enabled proper release-it version detection in deploy script
- Version tag correction from incorrect 0.2.0 back to 0.1.x sequence

## [0.1.11] - 2024-09-05

### Changed
- Deploy script restructured to create tags only after successful publishing

### Fixed
- Improved version handling in deployment process
- Deploy script npm scripts added for better workflow

## [0.1.10] - 2024-09-05

> Note: Version 0.1.10 exists in commit history but was not formally tagged

### Fixed
- Improved deploy script pnpm usage and error handling

## [0.1.9] - 2024-09-05

> Note: Version 0.1.9 exists in commit history but was not formally tagged

### Changed
- Deploy script migrated from npm to pnpm

## [0.1.8] - 2024-09-05

> Note: Version 0.1.8 exists in commit history but was not formally tagged

### Added
- Missing marketplace fields for better VS Code marketplace discoverability
- Optimized icon packaging for faster extension loading

## [0.1.7] - 2024-09-05

> Note: Version 0.1.7 exists in commit history but was not formally tagged

### Fixed
- Status bar unlock icon now remains visible at all times

## [0.1.6] - 2024-09-05

> Note: Version 0.1.6 exists in commit history but was not formally tagged

### Fixed
- Status bar lock icon no longer disappears unexpectedly

## [0.1.5] - 2024-09-05

> Note: Version 0.1.5 exists in commit history but was not formally tagged

### Added
- Logo and visual brand assets
- Correct dock icon with optimized packaging

### Changed
- Keyboard shortcut changed from Cmd+Shift+L to Cmd+K Cmd+L to avoid conflicts

### Fixed
- README updated with correct keyboard shortcut documentation

## [0.1.0] - 2024-09-05

### Added
- Initial release of Lockor VS Code extension
- File locking and unlocking functionality with command palette integration
- Three protection levels: Soft (warnings only), AI-Aware (AI blocked, human warnings), Hard (OS read-only)
- Language-aware file markers with appropriate comment syntax for different file types
- `.lockor` YAML status file generation for workspace-level tracking
- Cursor AI integration with `.cursor/rules/lockor.mdc` rule generation
- Status bar indicator with gold warning background for locked files
- VS Code workspace diagnostics integration with linting-style warnings
- Debounced notifications to prevent spam during rapid file operations
- Hard mode conflict resolution for file markers
- Multi-layer AI visibility system (VS Code context, .lockor file, .cursor rules)
- Comprehensive settings and configuration options

### Features
- 🔒 Smart file protection system with granular control
- 🤖 AI integration and blocking capabilities for AI assistants
- 📁 Multiple AI visibility layers for comprehensive protection
- ⚙️ Advanced configuration options with per-file customization
- 🎯 Protection levels for different use cases and team workflows
- 📊 Status bar and visual indicators for immediate feedback
- 💾 Persistent lock state management across VS Code sessions
- 🚫 Save prevention and OS-level read-only enforcement (Hard mode)
