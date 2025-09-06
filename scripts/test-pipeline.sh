#!/bin/bash

###############################################################################
# PIPELINE TEST SCRIPT FOR LOCKOR VS CODE EXTENSION
###############################################################################
#
# This script makes a small, repeatable change to trigger the CI/CD pipeline
# for testing purposes. It modifies a comment in the extension source code
# to ensure the pipeline detects extension changes and runs the full flow.
#
# USAGE:
#   ./scripts/test-pipeline.sh [options]
#
# OPTIONS:
#   --dry-run          Show what would be done without making changes
#   --commit           Automatically commit and push the changes
#   --help             Show this help message
#
# WORKFLOW:
#   1. Makes a small change to src/extension.ts (adds/updates a test comment)
#   2. Optionally commits and pushes the change
#   3. Triggers the CI/CD pipeline to test the full deployment flow
#
# REQUIREMENTS:
#   - Git repository with proper remote setup
#   - Currently on develop or main branch
#   - Git configured with user name and email
#
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default options
DRY_RUN=false
AUTO_COMMIT=false
HELP=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --commit)
      AUTO_COMMIT=true
      shift
      ;;
    --help)
      HELP=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Show help
if [[ "$HELP" == true ]]; then
  cat << EOF
Pipeline Test Script for Lockor VS Code Extension

USAGE:
  ./scripts/test-pipeline.sh [options]

OPTIONS:
  --dry-run          Show what would be done without making changes
  --commit           Automatically commit and push the changes
  --help             Show this help message

EXAMPLES:
  ./scripts/test-pipeline.sh                    # Make change, show what to do next
  ./scripts/test-pipeline.sh --dry-run          # See what would happen
  ./scripts/test-pipeline.sh --commit           # Make change and auto-commit/push

DESCRIPTION:
  This script makes a small, repeatable change to src/extension.ts by updating
  a test comment with a timestamp. This change will trigger the CI/CD pipeline
  because it modifies extension source code, ensuring the full deployment flow
  is tested.

  The change is designed to be:
  - Small and non-functional (just a comment)
  - Repeatable (can be run multiple times)
  - Detectable by the pipeline (modifies src/** files)
  - Safe (doesn't affect extension functionality)

REQUIREMENTS:
  - Git repository with proper remote setup
  - Currently on develop or main branch
  - Git configured with user name and email
EOF
  exit 0
fi

# Logging functions
log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

log_step() {
  echo -e "\n${BLUE}🔄 $1${NC}"
}

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -f "src/extension.ts" ]]; then
  log_error "This script must be run from the project root directory"
  exit 1
fi

# Check if we're on a valid branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "develop" && "$CURRENT_BRANCH" != "main" ]]; then
  log_error "This script must be run on 'develop' or 'main' branch"
  log_info "Current branch: $CURRENT_BRANCH"
  log_info "Switch to develop or main branch first"
  exit 1
fi

log_success "Running on branch: $CURRENT_BRANCH"

# Check git status
if [[ -n "$(git status --porcelain)" ]]; then
  log_warning "Working directory has uncommitted changes"
  if [[ "$DRY_RUN" == false ]]; then
    log_info "Please commit or stash your changes first"
    exit 1
  fi
fi

# Generate test comment with timestamp
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
TEST_COMMENT="// Pipeline test change - $TIMESTAMP"

log_step "Making pipeline test change..."

# Read the current extension.ts file
EXTENSION_FILE="src/extension.ts"
if [[ ! -f "$EXTENSION_FILE" ]]; then
  log_error "Extension file not found: $EXTENSION_FILE"
  exit 1
fi

# Create a backup
if [[ "$DRY_RUN" == false ]]; then
  cp "$EXTENSION_FILE" "$EXTENSION_FILE.backup"
fi

# Find the last test comment and replace it, or add a new one
if [[ "$DRY_RUN" == true ]]; then
  log_info "DRY RUN: Would add/update test comment: $TEST_COMMENT"
  log_info "DRY RUN: Would modify $EXTENSION_FILE"
else
  # Check if there's already a test comment
  if grep -q "Pipeline test change" "$EXTENSION_FILE"; then
    # Replace existing test comment
    sed -i.tmp "s|// Pipeline test change - .*|$TEST_COMMENT|" "$EXTENSION_FILE"
    rm -f "$EXTENSION_FILE.tmp"
    log_info "Updated existing test comment"
  else
    # Add new test comment after the first comment block
    # Find the end of the first comment block and add our test comment
    awk '
      /^\/\*.*\*\/$/ { 
        print $0
        print "// Pipeline test change - '"$TIMESTAMP"'"
        next 
      }
      /^\/\*/ { 
        in_comment = 1 
        print $0
        next 
      }
      in_comment && /\*\// { 
        in_comment = 0
        print $0
        print "// Pipeline test change - '"$TIMESTAMP"'"
        next 
      }
      !in_comment && /^\/\// { 
        print $0
        print "// Pipeline test change - '"$TIMESTAMP"'"
        next 
      }
      { print $0 }
    ' "$EXTENSION_FILE" > "$EXTENSION_FILE.tmp" && mv "$EXTENSION_FILE.tmp" "$EXTENSION_FILE"
    log_info "Added new test comment"
  fi
  
  log_success "Modified $EXTENSION_FILE with test comment"
fi

# Show the change
if [[ "$DRY_RUN" == false ]]; then
  log_step "Change preview:"
  git diff "$EXTENSION_FILE" || true
fi

# Commit and push if requested
if [[ "$AUTO_COMMIT" == true ]]; then
  if [[ "$DRY_RUN" == true ]]; then
    log_info "DRY RUN: Would commit and push changes"
  else
    log_step "Committing and pushing changes..."
    
    # Stage the change
    git add "$EXTENSION_FILE"
    
    # Commit with conventional commit message
    COMMIT_MSG="test(ci): trigger pipeline test - $TIMESTAMP"
    git commit -m "$COMMIT_MSG"
    log_success "Committed changes: $COMMIT_MSG"
    
    # Push to remote
    git push origin "$CURRENT_BRANCH"
    log_success "Pushed changes to origin/$CURRENT_BRANCH"
    
    log_success "Pipeline should now be triggered! 🚀"
    log_info "Check GitHub Actions to monitor the pipeline progress"
  fi
else
  if [[ "$DRY_RUN" == false ]]; then
    log_step "Next steps:"
    log_info "1. Review the changes: git diff $EXTENSION_FILE"
    log_info "2. Stage the changes: git add $EXTENSION_FILE"
    log_info "3. Commit the changes: git commit -m 'test(ci): trigger pipeline test'"
    log_info "4. Push to trigger pipeline: git push origin $CURRENT_BRANCH"
    log_info ""
    log_info "Or run with --commit to do steps 2-4 automatically"
  fi
fi

# Cleanup backup
if [[ "$DRY_RUN" == false && -f "$EXTENSION_FILE.backup" ]]; then
  rm -f "$EXTENSION_FILE.backup"
fi

# Summary
log_step "Pipeline Test Summary"
log_success "Modified: $EXTENSION_FILE"
log_success "Test comment: $TEST_COMMENT"
log_success "Branch: $CURRENT_BRANCH"

if [[ "$AUTO_COMMIT" == true ]]; then
  log_success "Changes committed and pushed"
  log_info "Pipeline should be running now - check GitHub Actions!"
else
  log_info "Changes made but not committed"
  log_info "Run with --commit to automatically commit and push"
fi

if [[ "$DRY_RUN" == true ]]; then
  log_warning "This was a dry run - no actual changes were made"
fi

log_success "Pipeline test setup completed! 🎉"
