#!/bin/bash

###############################################################################
# PIPELINE LOGIC TEST SCRIPT
###############################################################################
#
# This script tests the pipeline logic without requiring Docker or act.
# It simulates the changes detection and shows what the pipeline would do.
#
# USAGE:
#   ./scripts/test-pipeline-logic.sh [options]
#
# OPTIONS:
#   --make-change      Make a test change before testing
#   --simulate-push    Simulate a push event
#   --help             Show this help message
#
# WORKFLOW:
#   1. Makes a test change (optional)
#   2. Simulates the changes detection logic
#   3. Shows what jobs would run based on the changes
#   4. Provides next steps for testing
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
MAKE_CHANGE=false
SIMULATE_PUSH=false
HELP=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --make-change)
      MAKE_CHANGE=true
      shift
      ;;
    --simulate-push)
      SIMULATE_PUSH=true
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
Pipeline Logic Test Script

USAGE:
  ./scripts/test-pipeline-logic.sh [options]

OPTIONS:
  --make-change      Make a test change before testing
  --simulate-push    Simulate a push event
  --help             Show this help message

DESCRIPTION:
  This script tests the pipeline logic without requiring Docker or act.
  It simulates the changes detection and shows what the pipeline would do.

EXAMPLES:
  ./scripts/test-pipeline-logic.sh                    # Test current state
  ./scripts/test-pipeline-logic.sh --make-change      # Make change and test
  ./scripts/test-pipeline-logic.sh --simulate-push    # Simulate push event
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
if [[ ! -f "package.json" ]] || [[ ! -f ".github/workflows/pipe.yml" ]]; then
  log_error "This script must be run from the project root directory"
  exit 1
fi

# Make test change if requested
if [[ "$MAKE_CHANGE" == true ]]; then
  log_step "Making test change..."
  
  TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
  TEST_COMMENT="// Pipeline logic test - $TIMESTAMP"
  
  # Add test comment to extension.ts
  if grep -q "Pipeline logic test" src/extension.ts; then
    sed -i.tmp "s|// Pipeline logic test - .*|$TEST_COMMENT|" src/extension.ts
    rm -f src/extension.ts.tmp
    log_info "Updated existing test comment"
  else
    # Add new test comment after the first comment block
    awk '
      /^\/\*.*\*\/$/ { 
        print $0
        print "// Pipeline logic test - '"$TIMESTAMP"'"
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
        print "// Pipeline logic test - '"$TIMESTAMP"'"
        next 
      }
      !in_comment && /^\/\// { 
        print $0
        print "// Pipeline logic test - '"$TIMESTAMP"'"
        next 
      }
      { print $0 }
    ' src/extension.ts > src/extension.ts.tmp && mv src/extension.ts.tmp src/extension.ts
    log_info "Added new test comment"
  fi
  
  log_success "Modified src/extension.ts with test comment"
fi

# Simulate changes detection
log_step "Simulating changes detection..."

# Get the last tag
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [[ -z "$LAST_TAG" ]]; then
  log_info "No tags found, using HEAD~1 as base"
  BASE="HEAD~1"
else
  log_info "Last tag: $LAST_TAG"
  BASE="$LAST_TAG"
fi

# Check for extension changes
log_info "Checking for extension changes since $BASE..."
EXTENSION_CHANGES=$(git diff --name-only "$BASE" -- src/ package.json tsconfig.json "*.md" 2>/dev/null || echo "")

# Check for CI/CD changes  
log_info "Checking for CI/CD changes since $BASE..."
CICD_CHANGES=$(git diff --name-only "$BASE" -- .github/workflows/ .release-it.cjs .releaserc.json 2>/dev/null || echo "")

# Determine what changed
EXTENSION_CHANGED=false
CICD_CHANGED=false

if [[ -n "$EXTENSION_CHANGES" ]]; then
  EXTENSION_CHANGED=true
  log_success "Extension changes detected:"
  echo "$EXTENSION_CHANGES" | sed 's/^/  - /'
fi

if [[ -n "$CICD_CHANGES" ]]; then
  CICD_CHANGED=true
  log_success "CI/CD changes detected:"
  echo "$CICD_CHANGES" | sed 's/^/  - /'
fi

if [[ "$EXTENSION_CHANGED" == false && "$CICD_CHANGED" == false ]]; then
  log_warning "No changes detected since $BASE"
  log_info "The pipeline would not run"
  exit 0
fi

# Show what jobs would run
log_step "Pipeline Jobs That Would Run:"

if [[ "$EXTENSION_CHANGED" == true ]]; then
  log_success "Extension changes detected - Full pipeline would run:"
  echo "  ✅ Changes Detection"
  echo "  ✅ Linting (TypeScript)"
  echo "  ✅ Security Analysis (CodeQL)"
  echo "  ✅ Build & Test"
  echo "  ✅ Versioning"
  echo "  ✅ Tagging"
  echo "  ✅ Publishing (if on main branch)"
  echo "  ✅ Create PR (if on develop branch)"
elif [[ "$CICD_CHANGED" == true ]]; then
  log_success "CI/CD changes detected - Versioning pipeline would run:"
  echo "  ✅ Changes Detection"
  echo "  ✅ Linting (TypeScript)"
  echo "  ✅ Versioning"
  echo "  ✅ Tagging"
  echo "  ✅ Publishing (if on main branch)"
fi

# Show current branch
CURRENT_BRANCH=$(git branch --show-current)
log_info "Current branch: $CURRENT_BRANCH"

# Show what would happen on this branch
log_step "Branch-specific behavior:"

if [[ "$CURRENT_BRANCH" == "develop" ]]; then
  log_info "On develop branch:"
  echo "  - Versioning would run"
  echo "  - Tagging would run"
  echo "  - PR creation would run (if extension changes)"
  echo "  - Publishing would NOT run (only on main)"
elif [[ "$CURRENT_BRANCH" == "main" ]]; then
  log_info "On main branch:"
  echo "  - Versioning would run"
  echo "  - Tagging would run"
  echo "  - Publishing would run"
  echo "  - PR creation would NOT run (only on develop)"
else
  log_warning "Not on develop or main branch - pipeline would not run"
fi

# Show next steps
log_step "Next Steps"

if [[ "$EXTENSION_CHANGED" == true ]]; then
  log_info "To test the full pipeline:"
  echo "  1. Commit your changes: git add . && git commit -m 'test(ci): pipeline test'"
  echo "  2. Push to trigger pipeline: git push origin $CURRENT_BRANCH"
  echo "  3. Or use the quick test script: ./scripts/quick-test.sh"
fi

log_info "To test locally with act (requires Docker):"
echo "  1. Start Docker Desktop"
echo "  2. Run: ./scripts/test-pipeline-local.sh --full-pipeline"

log_info "To test changes detection only:"
echo "  ./scripts/test-pipeline-logic.sh --make-change"

log_success "Pipeline logic test completed! 🎉"
