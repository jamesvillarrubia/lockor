#!/bin/bash

###############################################################################
# LOCAL DEPLOYMENT SCRIPT FOR LOCKOR VS CODE EXTENSION
###############################################################################
#
# This script mirrors the GitHub Actions CI/CD pipeline for local deployment.
# It handles versioning, packaging, and publishing to Open VSX Registry.
#
# USAGE:
#   ./scripts/deploy.sh [options]
#
# OPTIONS:
#   --dry-run          Show what would be done without making changes
#   --skip-publish     Package but don't publish to Open VSX
#   --help             Show this help message
#
# REQUIREMENTS:
#   - OVSX_PAT environment variable set (or in .github/config/github-config.yml)
#   - Git repository with proper tags
#   - Node.js and pnpm installed
#
# WORKFLOW:
#   1. Check prerequisites and environment
#   2. Check if there's a new version to release using release-it
#   3. Clean up existing VSIX files
#   4. Compile TypeScript
#   5. Package extension into VSIX with determined version
#   6. Publish to Open VSX Registry
#   7. Create git tag only after successful publishing
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
SKIP_PUBLISH=false
HELP=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --skip-publish)
      SKIP_PUBLISH=true
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
Local Deployment Script for Lockor VS Code Extension

USAGE:
  ./scripts/deploy.sh [options]

OPTIONS:
  --dry-run          Show what would be done without making changes
  --skip-publish     Package but don't publish to Open VSX
  --help             Show this help message

EXAMPLES:
  ./scripts/deploy.sh                    # Use release-it to determine version and deploy
  ./scripts/deploy.sh --dry-run          # See what would happen
  ./scripts/deploy.sh --skip-publish     # Package only, don't publish

REQUIREMENTS:
  - OVSX_PAT environment variable set
  - Git repository with proper tags
  - Node.js and pnpm installed
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
if [[ ! -f "package.json" ]] || [[ ! -f ".release-it.cjs" ]]; then
  log_error "This script must be run from the project root directory"
  exit 1
fi

# Check prerequisites
log_step "Checking prerequisites..."

# Check if git is available
if ! command -v git &> /dev/null; then
  log_error "Git is required but not installed"
  exit 1
fi

# Check if node is available
if ! command -v node &> /dev/null; then
  log_error "Node.js is required but not installed"
  exit 1
fi

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
  log_error "pnpm is required but not installed"
  exit 1
fi

# Check if ovsx is available
if ! command -v ovsx &> /dev/null; then
  log_warning "ovsx CLI not found globally, will install locally"
fi

# Check OVSX_PAT
if [[ -z "${OVSX_PAT:-}" ]]; then
  # Try to load from config file
  if [[ -f ".github/config/github-config.yml" ]]; then
    log_info "Loading OVSX_PAT from .github/config/github-config.yml"
    OVSX_PAT=$(grep -A 1 "OVSX_PAT:" .github/config/github-config.yml | grep "value:" | sed 's/.*value: "\(.*\)"/\1/')
    if [[ -n "$OVSX_PAT" ]]; then
      export OVSX_PAT
      log_success "OVSX_PAT loaded from config file"
    fi
  fi
  
  if [[ -z "${OVSX_PAT:-}" ]]; then
    log_error "OVSX_PAT environment variable is required"
    log_info "Set it with: export OVSX_PAT='your_token_here'"
    log_info "Or add it to .github/config/github-config.yml"
    exit 1
  fi
fi

log_success "Prerequisites check passed"

# Check if there's a new version to release
log_step "Checking if there's a new version to release..."

# Get current git tag
CURRENT_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
CURRENT_VERSION=${CURRENT_TAG#v}  # Remove 'v' prefix

log_info "Current version from git tag: $CURRENT_VERSION"

# Check if current commit already has a tag
COMMIT_TAG=$(git tag --points-at HEAD | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' || true)

if [[ -n "$COMMIT_TAG" ]]; then
  VERSION=${COMMIT_TAG#v}
  log_info "Current commit already tagged: $VERSION"
  SHOULD_PUBLISH=true
else
  # Use release-it to determine next version
  log_info "Determining next version using release-it..."
  
  # Get next version using release-it (suppress warnings to stderr)
  NEXT_VERSION=$(npx release-it --ci --release-version 2>/dev/null | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | head -1 || echo "")
  
  if [[ -z "$NEXT_VERSION" || "$NEXT_VERSION" == "0.0.0" ]]; then
    log_warning "No new version to release"
    log_info "Current version: $CURRENT_VERSION"
    log_info "Make some commits and try again, or run 'npx release-it' to create a release"
    exit 0
  else
    VERSION="$NEXT_VERSION"
    log_success "Next version determined: $VERSION"
    SHOULD_PUBLISH=true
  fi
fi

# Only proceed if we have a version to publish
if [[ "$SHOULD_PUBLISH" != true ]]; then
  log_error "No version to publish"
  exit 1
fi

# Note: package.json version is kept at 0.0.0-release-it for release-it compatibility
log_step "Using version $VERSION (package.json remains at 0.0.0-release-it)"
log_info "Package.json version is intentionally kept at 0.0.0-release-it for release-it compatibility"

# Install dependencies
log_step "Installing dependencies..."
if [[ "$DRY_RUN" == true ]]; then
  log_info "DRY RUN: Would run pnpm install"
else
  pnpm install --frozen-lockfile
  log_success "Dependencies installed"
fi

# Compile TypeScript
log_step "Compiling TypeScript..."
if [[ "$DRY_RUN" == true ]]; then
  log_info "DRY RUN: Would run pnpm run compile"
else
  pnpm run compile
  log_success "TypeScript compiled"
fi

# Clean up existing VSIX files
log_step "Cleaning up existing VSIX files..."

if [[ "$DRY_RUN" == true ]]; then
  log_info "DRY RUN: Would remove existing *.vsix files"
else
  # Remove all existing VSIX files
  if ls *.vsix 1> /dev/null 2>&1; then
    log_info "Removing existing VSIX files..."
    rm -f *.vsix
    log_success "Cleaned up existing VSIX files"
  else
    log_info "No existing VSIX files to clean up"
  fi
fi

# Package extension
log_step "Packaging extension..."

# Install vsce if not available
if ! command -v vsce &> /dev/null; then
  log_info "Installing vsce..."
  if [[ "$DRY_RUN" == true ]]; then
    log_info "DRY RUN: Would install @vscode/vsce"
  else
    pnpm install -g @vscode/vsce
  fi
fi

VSIX_FILE="lockor-$VERSION.vsix"

if [[ "$DRY_RUN" == true ]]; then
  log_info "DRY RUN: Would create VSIX file: $VSIX_FILE"
else
  # Try to package with vsce using the determined version
  if ! vsce package --no-dependencies --out "$VSIX_FILE" --version "$VERSION"; then
    log_warning "vsce failed, trying with npx..."
    npx @vscode/vsce@latest package --no-dependencies --out "$VSIX_FILE" --version "$VERSION"
  fi
  
  if [[ ! -f "$VSIX_FILE" ]]; then
    log_error "VSIX file not created: $VSIX_FILE"
    exit 1
  fi
  
  log_success "Extension packaged: $VSIX_FILE"
fi

# Publish to Open VSX Registry
if [[ "$SKIP_PUBLISH" == false ]]; then
  log_step "Publishing to Open VSX Registry..."
  
  # Install ovsx if not available
  if ! command -v ovsx &> /dev/null; then
    log_info "Installing ovsx CLI..."
    if [[ "$DRY_RUN" == true ]]; then
      log_info "DRY RUN: Would install ovsx"
    else
      pnpm install -g ovsx
    fi
  fi
  
  if [[ "$DRY_RUN" == true ]]; then
    log_info "DRY RUN: Would create namespace 'lockor' if needed"
    log_info "DRY RUN: Would publish $VSIX_FILE to Open VSX Registry"
  else
    # Create namespace if it doesn't exist (this is safe to run multiple times)
    log_info "Ensuring namespace 'lockor' exists..."
    ovsx create-namespace lockor 2>/dev/null || true
    
    # Publish the extension
    ovsx publish "$VSIX_FILE" --pat "$OVSX_PAT"
    log_success "Successfully published version $VERSION to Open VSX Registry!"
  fi
else
  log_info "Skipping publish (--skip-publish flag used)"
fi

# Create git tag only after successful publishing (if not dry run and not skip publish)
if [[ "$DRY_RUN" == false && "$SKIP_PUBLISH" == false ]]; then
  log_step "Creating git tag after successful publishing..."
  
  TAG_NAME="v$VERSION"
  
  # Check if tag already exists
  if git tag --list | grep -q "^$TAG_NAME$"; then
    log_info "Tag $TAG_NAME already exists"
  else
    log_info "Creating git tag: $TAG_NAME (marking successful release)"
    git tag "$TAG_NAME"
    log_success "Created git tag: $TAG_NAME"
    
    read -p "Push tag to remote? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      git push origin "$TAG_NAME"
      log_success "Pushed tag to remote"
    else
      log_warning "Tag not pushed to remote - this may affect future release-it runs"
    fi
  fi
fi

# Summary
log_step "Deployment Summary"
log_success "Version: $VERSION"
log_success "VSIX file: $VSIX_FILE"

if [[ "$SKIP_PUBLISH" == false ]]; then
  log_success "Published to Open VSX Registry"
else
  log_info "Publishing skipped"
fi

if [[ "$DRY_RUN" == true ]]; then
  log_warning "This was a dry run - no actual changes were made"
fi

log_success "Deployment completed successfully! 🎉"
