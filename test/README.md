# Lockor Test Suite

This directory contains all tests for the Lockor VS Code extension, organized by test type and functionality.

## Test Structure

### Unit Tests (`test/unit/`)
Fast, isolated tests for individual components:
- **`extension.test.ts`** - Main extension activation, commands, and event handlers
- **`lockor-manager.test.ts`** - LockorManager class (file locking functionality)
- **`status-bar-manager.test.ts`** - Status bar integration
- **`git-hook-manager.test.ts`** - GitHookManager class
- **`setup.ts`** - Test setup and mocking configuration

### Integration Tests (`test/integration/`)
Tests for component interactions:
- **`lockor-git-integration.test.ts`** - LockorManager + GitHookManager integration

### End-to-End Tests (`test/e2e/`)
Full workflow tests with real git repositories:
- **`git-pre-commit-hook.test.ts`** - Complete git pre-commit hook functionality
- **`ai-bypass-scenarios.test.ts`** - AI bypass detection and real-world scenarios

### Utilities (`test/utils/`)
Test infrastructure and cleanup:
- **`cleanup-test-dirs.js`** - Clean up leftover test directories

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific test categories
pnpm test test/unit/          # Unit tests only
pnpm test test/integration/   # Integration tests only  
pnpm test test/e2e/          # End-to-end tests only

# Run specific test file
pnpm test test/e2e/git-pre-commit-hook.test.ts

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Test Organization

### Unit Tests
- Test individual classes and methods in isolation
- Use mocks for external dependencies
- Fast execution, no side effects

### Integration Tests
- Test interactions between components
- Use real git repositories in temporary directories
- Clean up after each test

### End-to-End Tests
- Test complete workflows
- Simulate real user scenarios
- Test git hook functionality with actual git commands

## Test Data

All tests are designed to be **idempotent** - they can be run multiple times without side effects. Test directories are created with unique timestamps and cleaned up automatically.

## Git Hook Testing

The git hook tests create temporary git repositories and test the actual pre-commit hook functionality:

1. **Hook Installation** - Tests that hooks are installed correctly
2. **Commit Blocking** - Tests that locked files are blocked from commits
3. **AI Bypass Detection** - Tests that external modifications are caught
4. **Error Handling** - Tests graceful handling of missing commands
5. **Configuration Changes** - Tests hook enable/disable functionality

## Cleanup

If tests fail and leave behind test directories, run:

```bash
node test/utils/cleanup-test-dirs.js
```

This will remove any leftover test directories from failed test runs.
