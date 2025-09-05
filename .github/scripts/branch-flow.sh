#!/bin/bash

# Branch Flow Helper Script
# Reads branch-flow.yml and provides branch flow logic

set -e

CONFIG_FILE=".github/config/branch-flow.yml"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_PATH="$PROJECT_ROOT/$CONFIG_FILE"

# Function to get branch list from config
get_branches() {
    if command -v yq >/dev/null 2>&1; then
        yq eval '.branches[]' "$CONFIG_PATH"
    elif command -v npx >/dev/null 2>&1; then
        cat "$CONFIG_PATH" | npx yaml --json | node -e "
            const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
            if (data && data[0] && data[0].branches) {
                data[0].branches.forEach(branch => console.log(branch));
            }
        "
    else
        echo "Error: Neither yq nor npx available for YAML parsing" >&2
        exit 1
    fi
}

# Function to get next branch in sequence
get_next_branch() {
    local current_branch="$1"
    local branches=($(get_branches))
    local current_index=-1
    
    # Find current branch index
    for i in "${!branches[@]}"; do
        if [[ "${branches[$i]}" == "$current_branch" ]]; then
            current_index=$i
            break
        fi
    done
    
    # Return next branch or empty if at end
    if [[ $current_index -ge 0 && $((current_index + 1)) -lt ${#branches[@]} ]]; then
        echo "${branches[$((current_index + 1))]}"
    else
        echo ""
    fi
}

# Function to check if branch has a specific role
has_role() {
    local branch="$1"
    local role="$2"
    
    if command -v yq >/dev/null 2>&1; then
        yq eval ".roles.$branch.$role" "$CONFIG_PATH" 2>/dev/null || echo "false"
    elif command -v npx >/dev/null 2>&1; then
        cat "$CONFIG_PATH" | npx yaml --json | node -e "
            const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
            if (data && data[0] && data[0].roles && data[0].roles['$branch']) {
                console.log(data[0].roles['$branch']['$role'] || false);
            } else {
                console.log(false);
            }
        "
    else
        echo "false"
    fi
}

# Function to get branches for a specific trigger
get_trigger_branches() {
    local trigger="$1"
    
    if command -v yq >/dev/null 2>&1; then
        yq eval ".triggers.$trigger[]" "$CONFIG_PATH" 2>/dev/null || echo ""
    elif command -v npx >/dev/null 2>&1; then
        cat "$CONFIG_PATH" | npx yaml --json | node -e "
            const data = JSON.parse(require('fs').readFileSync(0, 'utf8'));
            if (data && data[0] && data[0].triggers && data[0].triggers['$trigger']) {
                data[0].triggers['$trigger'].forEach(branch => console.log(branch));
            }
        "
    else
        echo ""
    fi
}

# Main command handling
case "${1:-}" in
    "next")
        if [[ -z "${2:-}" ]]; then
            echo "Usage: $0 next <current_branch>" >&2
            exit 1
        fi
        get_next_branch "$2"
        ;;
    "has-role")
        if [[ -z "${2:-}" || -z "${3:-}" ]]; then
            echo "Usage: $0 has-role <branch> <role>" >&2
            exit 1
        fi
        has_role "$2" "$3"
        ;;
    "trigger-branches")
        if [[ -z "${2:-}" ]]; then
            echo "Usage: $0 trigger-branches <trigger>" >&2
            exit 1
        fi
        get_trigger_branches "$2"
        ;;
    "list")
        get_branches
        ;;
    *)
        echo "Usage: $0 {next|has-role|trigger-branches|list} [args...]" >&2
        echo "  next <branch>              - Get next branch in sequence" >&2
        echo "  has-role <branch> <role>   - Check if branch has role" >&2
        echo "  trigger-branches <trigger> - Get branches for trigger" >&2
        echo "  list                       - List all branches" >&2
        exit 1
        ;;
esac
