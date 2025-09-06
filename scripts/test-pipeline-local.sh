#!/bin/bash

###############################################################################
# LOCAL PIPELINE TEST SCRIPT USING ACT
###############################################################################
#
# This script tests the CI/CD pipeline locally using the 'act' tool.
# It simulates a push to the develop branch and runs the full pipeline
# without actually pushing to GitHub.
#
# USAGE:
#   ./scripts/test-pipeline-local.sh [options]
#
# OPTIONS:
#   --dry-run          Show what would be done without making changes
#   --make-change      Make a test change before running act
#   --full-pipeline    Run the complete pipeline (default: changes detection only)
#   --help             Show this help message
#
# REQUIREMENTS:
#   - act tool installed (https://github.com/nektos/act)
#   - Docker running (act uses Docker containers)
#   - Git repository with proper setup
#
# WORKFLOW:
#   1. Optionally makes a small test change to src/extension.ts
#   2. Runs act to simulate the CI/CD pipeline locally
#   3. Shows results and next steps
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
MAKE_CHANGE=false
FULL_PIPELINE=false
HELP=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --make-change)
      MAKE_CHANGE=true
      shift
      ;;
    --full-pipeline)
      FULL_PIPELINE=true
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
Local Pipeline Test Script using Act

USAGE:
  ./scripts/test-pipeline-local.sh [options]

OPTIONS:
  --dry-run          Show what would be done without making changes
  --make-change      Make a test change before running act
  --full-pipeline    Run the complete pipeline (default: changes detection only)
  --help             Show this help message

EXAMPLES:
  ./scripts/test-pipeline-local.sh                    # Test changes detection only
  ./scripts/test-pipeline-local.sh --make-change      # Make change and test detection
  ./scripts/test-pipeline-local.sh --full-pipeline    # Run complete pipeline locally
  ./scripts/test-pipeline-local.sh --dry-run          # See what would happen

DESCRIPTION:
  This script uses the 'act' tool to test GitHub Actions workflows locally.
  It simulates a push to the develop branch and runs the CI/CD pipeline
  without actually pushing to GitHub.

  The script can:
  - Make a small test change to trigger extension changes detection
  - Run the changes detection job to verify file pattern matching
  - Run the complete pipeline including build, test, and versioning
  - Show detailed output of each step

REQUIREMENTS:
  - act tool installed (https://github.com/nektos/act)
  - Docker running (act uses Docker containers)
  - Git repository with proper setup

WORKFLOW STAGES:
  1. Changes Detection - Detects which files changed
  2. Linting - Runs TypeScript linting
  3. Build & Test - Compiles and tests the extension
  4. Versioning - Determines next version using conventional commits
  5. Tagging - Creates git tags
  6. Publishing - Packages and publishes to Open VSX Registry
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

# Check prerequisites
log_step "Checking prerequisites..."

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -f ".github/workflows/pipe.yml" ]]; then
  log_error "This script must be run from the project root directory"
  exit 1
fi

# Check if act is available
if ! command -v act &> /dev/null; then
  log_error "act tool is not installed"
  log_info "Install it from: https://github.com/nektos/act"
  exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
  log_error "Docker is not running"
  log_info "Start Docker and try again"
  exit 1
fi

log_success "Prerequisites check passed"

# Make test change if requested
if [[ "$MAKE_CHANGE" == true ]]; then
  log_step "Making test change..."
  
  if [[ "$DRY_RUN" == true ]]; then
    log_info "DRY RUN: Would add test comment to src/extension.ts"
  else
    TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
    TEST_COMMENT="// Act test change - $TIMESTAMP"
    
    # Add test comment to extension.ts
    if grep -q "Act test change" src/extension.ts; then
      sed -i.tmp "s|// Act test change - .*|$TEST_COMMENT|" src/extension.ts
      rm -f src/extension.ts.tmp
      log_info "Updated existing test comment"
    else
      # Add new test comment after the first comment block
      awk '
        /^\/\*.*\*\/$/ { 
          print $0
          print "// Act test change - '"$TIMESTAMP"'"
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
          print "// Act test change - '"$TIMESTAMP"'"
          next 
        }
        !in_comment && /^\/\// { 
          print $0
          print "// Act test change - '"$TIMESTAMP"'"
          next 
        }
        { print $0 }
      ' src/extension.ts > src/extension.ts.tmp && mv src/extension.ts.tmp src/extension.ts
      log_info "Added new test comment"
    fi
    
    log_success "Modified src/extension.ts with test comment"
  fi
fi

# Run act to test the pipeline
log_step "Running act to test pipeline locally..."

if [[ "$FULL_PIPELINE" == true ]]; then
  log_info "Running complete pipeline (this may take several minutes)..."
  
  if [[ "$DRY_RUN" == true ]]; then
    log_info "DRY RUN: Would run: act push -W .github/workflows/pipe.yml"
  else
    # Run the complete pipeline
    act push -W .github/workflows/pipe.yml --verbose
  fi
else
  log_info "Running changes detection only..."
  
  if [[ "$DRY_RUN" == true ]]; then
    log_info "DRY RUN: Would run: act push -W .github/workflows/pipe.yml -j changes"
  else
    # Run only the changes detection job
    act push -W .github/workflows/pipe.yml -j changes --verbose
  fi
fi

# Show results
log_step "Pipeline Test Results"

if [[ "$DRY_RUN" == true ]]; then
  log_warning "This was a dry run - no actual changes were made"
else
  if [[ "$FULL_PIPELINE" == true ]]; then
    log_success "Complete pipeline test completed!"
    log_info "Check the output above for any errors or issues"
  else
    log_success "Changes detection test completed!"
    log_info "Check the output above to see which file patterns were detected"
  fi
fi

# Show next steps
log_step "Next Steps"

if [[ "$FULL_PIPELINE" == false ]]; then
  log_info "To test the complete pipeline, run:"
  log_info "  ./scripts/test-pipeline-local.sh --full-pipeline"
fi

log_info "To test with a real change, run:"
log_info "  ./scripts/test-pipeline-local.sh --make-change --full-pipeline"

log_info "To test the actual GitHub pipeline, run:"
log_info "  ./scripts/quick-test.sh"

log_success "Local pipeline test completed! 🎉"
