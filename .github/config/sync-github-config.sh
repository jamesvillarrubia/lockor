#!/bin/bash

# GitHub Repository Configuration Sync Script
# Syncs environment variables and secrets from YAML config to GitHub repository

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_OWNER="jamesvillarrubia"
REPO_NAME="lockor"
CONFIG_FILE=".github/config/github-config.yml"

# GitHub CLI check
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed${NC}"
    echo "Install it with: brew install gh"
    exit 1
fi

# Node.js check (should be available in Node.js projects)
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "This script requires Node.js to parse YAML files"
    exit 1
fi

# Cache for parsed YAML JSON
YAML_JSON_CACHE=""
YAML_CACHE_FILE=""

# Function to get cached JSON or parse YAML file
get_yaml_json() {
    local file="$1"
    
    # If we already cached this file, return cached result
    if [ "$YAML_CACHE_FILE" = "$file" ] && [ -n "$YAML_JSON_CACHE" ]; then
        echo "$YAML_JSON_CACHE"
        return
    fi
    
    # Parse YAML to JSON and cache it
    YAML_CACHE_FILE="$file"
    if command -v jq &> /dev/null; then
        YAML_JSON_CACHE=$(npx --yes --package=yaml yaml --json < "$file" 2>/dev/null)
    else
        # Fallback: create JSON using Node.js
        YAML_JSON_CACHE=$(npx --yes --package=yaml node -p "
        const yaml = require('yaml');
        const fs = require('fs');
        try {
            const data = yaml.parse(fs.readFileSync('$file', 'utf8'));
            JSON.stringify([data]);
        } catch { '[]' }
        " 2>/dev/null)
    fi
    
    echo "$YAML_JSON_CACHE"
}

# Function to parse YAML using cached JSON
yaml_get() {
    local file="$1"
    local path="$2"
    
    local json=$(get_yaml_json "$file")
    
    if command -v jq &> /dev/null; then
        echo "$json" | jq -r ".[0].${path} // empty" 2>/dev/null || echo ""
    else
        # Simple extraction without jq
        npx --yes --package=yaml node -p "
        try {
            const data = JSON.parse('$json');
            '$path'.split('.').reduce((obj, key) => obj?.[key], data[0]) || '';
        } catch { '' }
        " 2>/dev/null || echo ""
    fi
}

# Function to get YAML keys using cached JSON
yaml_keys() {
    local file="$1"
    local path="$2"
    
    local json=$(get_yaml_json "$file")
    
    if command -v jq &> /dev/null; then
        echo "$json" | jq -r ".[0].${path} | keys[]? // empty" 2>/dev/null || echo ""
    else
        # Simple key extraction without jq
        npx --yes --package=yaml node -p "
        try {
            const data = JSON.parse('$json');
            const obj = '$path'.split('.').reduce((obj, key) => obj?.[key], data[0]);
            obj && typeof obj === 'object' && !Array.isArray(obj) ? Object.keys(obj).join('\n') : '';
        } catch { '' }
        " 2>/dev/null || echo ""
    fi
}

# Function to validate YAML
yaml_validate() {
    local file="$1"
    
    # Use npx yaml valid command
    if npx --yes --package=yaml yaml valid < "$file" >/dev/null 2>&1; then
        echo "valid"
    else
        echo "invalid"
        return 1
    fi
}

# Check if yaml package is available (no longer need to install)
ensure_yaml_package() {
    # npx will handle package installation automatically, so this is now just a check
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js is required but not found${NC}"
        exit 1
    fi
}

# Authentication check
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${BLUE}🔧 GitHub Repository Configuration Sync${NC}"
echo -e "${BLUE}Repository: $REPO_OWNER/$REPO_NAME${NC}"
echo -e "${BLUE}Config File: $CONFIG_FILE${NC}"
echo ""

# Function to create template YAML file
create_template() {
    if [ ! -f "$CONFIG_FILE" ]; then
        echo -e "${YELLOW}Creating template config file: $CONFIG_FILE${NC}"
        cat > "$CONFIG_FILE" << 'EOF'
# GitHub Repository Configuration
# This file contains secrets and variables for the repository
# Secrets are encrypted, variables are plain text

metadata:
  repository: jamesvillarrubia/lockor
  description: "Configuration for Lockor VS Code extension CI/CD pipeline"
  last_updated: "2024-01-15"

# Secrets (encrypted in GitHub)
secrets:
  # Open VSX Personal Access Token (required for publishing)
  # Get from: https://open-vsx.org/-/user-settings/tokens
  OVSX_PAT:
    value: "your_ovsx_personal_access_token_here"
    description: "Personal Access Token for Open VSX Registry publishing"
    required: true
    
  # VS Code Marketplace Token (optional)
  # VSCE_PAT:
  #   value: "your_vscode_marketplace_token_here"
  #   description: "Personal Access Token for VS Code Marketplace"
  #   required: false

# Variables (plain text in GitHub)
variables:
  # Extension information
  EXTENSION_NAME:
    value: "lockor"
    description: "Name of the VS Code extension"
    
  PUBLISHER_NAME:
    value: "lockor"  
    description: "Publisher name for the extension"
    
  # Build configuration
  NODE_VERSION:
    value: "18"
    description: "Node.js version for CI/CD pipeline"
    
  PNPM_VERSION:
    value: "latest"
    description: "pnpm version for package management"
    
  # Registry configuration
  REGISTRY_URL:
    value: "https://open-vsx.org"
    description: "Open VSX Registry URL"

# Environment-specific configurations
environments:
  production:
    secrets:
      # Add production-specific secrets here if needed
    variables:
      ENVIRONMENT: "production"
      
  development:
    variables:
      ENVIRONMENT: "development"
      DEBUG: "true"
EOF
    fi
}

# Function to sync secrets
sync_secrets() {
    echo -e "${GREEN}🔐 Syncing secrets...${NC}"
    ensure_yaml_package
    
    # Check if secrets section exists
    if [ -z "$(yaml_get "$CONFIG_FILE" "secrets")" ]; then
        echo -e "${YELLOW}  No secrets section found${NC}"
        return 0
    fi
    
    # Get all secret keys
    secret_keys=$(yaml_keys "$CONFIG_FILE" "secrets")
    
    if [ -z "$secret_keys" ]; then
        echo -e "${YELLOW}  No secrets defined${NC}"
        return 0
    fi
    
    while IFS= read -r key; do
        # Get secret value and metadata
        value=$(yaml_get "$CONFIG_FILE" "secrets.${key}.value")
        description=$(yaml_get "$CONFIG_FILE" "secrets.${key}.description")
        required=$(yaml_get "$CONFIG_FILE" "secrets.${key}.required")
        
        # Skip if value is placeholder or empty
        if [[ "$value" == "null" ]] || [[ "$value" == *"your_"*"_here" ]] || [[ -z "$value" ]]; then
            if [[ "$required" == "true" ]]; then
                echo -e "${RED}  ❌ Required secret $key has placeholder value${NC}"
            else
                echo -e "${YELLOW}  ⚠️  Skipping $key (placeholder value)${NC}"
            fi
            continue
        fi
        
        echo -e "  📝 Setting secret: $key"
        if [ -n "$description" ] && [ "$description" != "null" ]; then
            echo -e "     💬 $description"
        fi
        
        # Set the secret using GitHub CLI
        if echo "$value" | gh secret set "$key" --repo "$REPO_OWNER/$REPO_NAME"; then
            echo -e "${GREEN}    ✅ $key updated successfully${NC}"
        else
            echo -e "${RED}    ❌ Failed to update $key${NC}"
        fi
        
    done <<< "$secret_keys"
}

# Function to sync variables
sync_variables() {
    echo -e "${GREEN}🌍 Syncing repository variables...${NC}"
    ensure_yaml_package
    
    # Check if variables section exists
    if [ -z "$(yaml_get "$CONFIG_FILE" "variables")" ]; then
        echo -e "${YELLOW}  No variables section found${NC}"
        return 0
    fi
    
    # Get all variable keys
    variable_keys=$(yaml_keys "$CONFIG_FILE" "variables")
    
    if [ -z "$variable_keys" ]; then
        echo -e "${YELLOW}  No variables defined${NC}"
        return 0
    fi
    
    while IFS= read -r key; do
        # Get variable value and metadata
        value=$(yaml_get "$CONFIG_FILE" "variables.${key}.value")
        description=$(yaml_get "$CONFIG_FILE" "variables.${key}.description")
        
        # Skip if value is empty or null
        if [[ "$value" == "null" ]] || [[ -z "$value" ]]; then
            echo -e "${YELLOW}  ⚠️  Skipping $key (empty value)${NC}"
            continue
        fi
        
        echo -e "  📝 Setting variable: $key=$value"
        if [ -n "$description" ] && [ "$description" != "null" ]; then
            echo -e "     💬 $description"
        fi
        
        # Set the variable using GitHub CLI
        if gh variable set "$key" --body "$value" --repo "$REPO_OWNER/$REPO_NAME"; then
            echo -e "${GREEN}    ✅ $key updated successfully${NC}"
        else
            echo -e "${RED}    ❌ Failed to update $key${NC}"
        fi
        
    done <<< "$variable_keys"
}

# Function to sync environments
sync_environments() {
    echo -e "${GREEN}🌐 Syncing environments...${NC}"
    ensure_yaml_package
    
    # Get environment keys
    env_keys=$(yaml_keys "$CONFIG_FILE" "environments")
    
    if [ -z "$env_keys" ]; then
        echo -e "${YELLOW}  No environments defined${NC}"
        return 0
    fi
    
    while IFS= read -r env_name; do
        echo -e "  🏗️  Setting up environment: $env_name"
        
        # Create environment (this will create it if it doesn't exist)
        if gh api repos/"$REPO_OWNER"/"$REPO_NAME"/environments/"$env_name" --method PUT >/dev/null 2>&1; then
            echo -e "${GREEN}    ✅ Environment $env_name ready${NC}"
        else
            echo -e "${RED}    ❌ Failed to create environment $env_name${NC}"
            continue
        fi
        
        # Sync environment-specific secrets
        env_secret_keys=$(yaml_keys "$CONFIG_FILE" "environments.${env_name}.secrets")
        if [ -n "$env_secret_keys" ]; then
            echo -e "    🔐 Setting environment secrets..."
            while IFS= read -r key; do
                value=$(yaml_get "$CONFIG_FILE" "environments.${env_name}.secrets.${key}.value")
                description=$(yaml_get "$CONFIG_FILE" "environments.${env_name}.secrets.${key}.description")
                
                # Skip if value is placeholder or empty
                if [[ "$value" == "null" ]] || [[ "$value" == *"your_"*"_here" ]] || [[ -z "$value" ]]; then
                    echo -e "${YELLOW}      ⚠️  Skipping $key (placeholder value)${NC}"
                    continue
                fi
                
                echo -e "      📝 Setting environment secret: $key"
                if [ -n "$description" ] && [ "$description" != "null" ]; then
                    echo -e "         💬 $description"
                fi
                
                # Set environment secret
                if echo "$value" | gh secret set "$key" --env "$env_name" --repo "$REPO_OWNER/$REPO_NAME"; then
                    echo -e "${GREEN}        ✅ $key updated successfully${NC}"
                else
                    echo -e "${RED}        ❌ Failed to update $key${NC}"
                fi
            done <<< "$env_secret_keys"
        fi
        
        # Sync environment-specific variables
        env_var_keys=$(yaml_keys "$CONFIG_FILE" "environments.${env_name}.variables")
        if [ -n "$env_var_keys" ]; then
            echo -e "    🌍 Setting environment variables..."
            while IFS= read -r key; do
                # Handle both simple values and object values
                value=$(yaml_get "$CONFIG_FILE" "environments.${env_name}.variables.${key}")
                
                # If it's an object, try to get the .value property
                if [ -z "$value" ] || [ "$value" = "null" ]; then
                    value=$(yaml_get "$CONFIG_FILE" "environments.${env_name}.variables.${key}.value")
                fi
                
                # Skip if value is empty or null
                if [[ "$value" == "null" ]] || [[ -z "$value" ]]; then
                    echo -e "${YELLOW}      ⚠️  Skipping $key (empty value)${NC}"
                    continue
                fi
                
                echo -e "      📝 Setting environment variable: $key=$value"
                
                # Set environment variable
                if gh variable set "$key" --body "$value" --env "$env_name" --repo "$REPO_OWNER/$REPO_NAME"; then
                    echo -e "${GREEN}        ✅ $key updated successfully${NC}"
                else
                    echo -e "${RED}        ❌ Failed to update $key${NC}"
                fi
            done <<< "$env_var_keys"
        fi
        
    done <<< "$env_keys"
}

# Function to validate YAML
validate_config() {
    echo -e "${BLUE}🔍 Validating configuration...${NC}"
    ensure_yaml_package
    
    if [ "$(yaml_validate "$CONFIG_FILE")" != "valid" ]; then
        echo -e "${RED}❌ Invalid YAML format in $CONFIG_FILE${NC}"
        return 1
    fi
    
    # Check for required secrets
    secret_keys=$(yaml_keys "$CONFIG_FILE" "secrets")
    
    if [ -n "$secret_keys" ]; then
        echo -e "${BLUE}  📋 Checking secrets:${NC}"
        while IFS= read -r key; do
            required=$(yaml_get "$CONFIG_FILE" "secrets.${key}.required")
            if [[ "$required" == "true" ]]; then
                value=$(yaml_get "$CONFIG_FILE" "secrets.${key}.value")
                if [[ "$value" == *"your_"*"_here" ]] || [[ -z "$value" ]] || [[ "$value" == "null" ]]; then
                    echo -e "${RED}    ❌ $key (required but missing)${NC}"
                else
                    echo -e "${GREEN}    ✅ $key (configured)${NC}"
                fi
            fi
        done <<< "$secret_keys"
    fi
    
    echo -e "${GREEN}✅ Configuration validation completed${NC}"
}

# Function to list current secrets and variables
list_current() {
    echo -e "${BLUE}📋 Current GitHub Repository Configuration:${NC}"
    echo ""
    
    echo -e "${GREEN}🔐 Secrets:${NC}"
    gh secret list --repo "$REPO_OWNER/$REPO_NAME" || echo "  No secrets found"
    echo ""
    
    echo -e "${GREEN}🌍 Variables:${NC}"
    gh variable list --repo "$REPO_OWNER/$REPO_NAME" || echo "  No variables found"
    echo ""
}

# Function to show configuration summary
show_config() {
    if [ ! -f "$CONFIG_FILE" ]; then
        echo -e "${RED}Configuration file not found: $CONFIG_FILE${NC}"
        return 1
    fi
    
    ensure_yaml_package
    echo -e "${BLUE}📄 Configuration Summary:${NC}"
    echo ""
    
    # Parse YAML once and generate the entire summary
    npx --yes --package=yaml node -e "
    const fs = require('fs');
    const yaml = require('yaml');
    
    try {
        const data = yaml.parse(fs.readFileSync('$CONFIG_FILE', 'utf8'));
        
        // Show metadata
        console.log('\x1b[32m📊 Metadata:\x1b[0m');
        const metadata = data.metadata || {};
        if (metadata.repository || metadata.description || metadata.last_updated) {
            if (metadata.repository) console.log('  Repository:', metadata.repository);
            if (metadata.description) console.log('  Description:', metadata.description);
            if (metadata.last_updated) console.log('  Last Updated:', metadata.last_updated);
        } else {
            console.log('  No metadata found');
        }
        console.log('');
        
        // Show secrets
        console.log('\x1b[32m🔐 Secrets:\x1b[0m');
        const secrets = data.secrets || {};
        const secretKeys = Object.keys(secrets);
        if (secretKeys.length > 0) {
            secretKeys.forEach(key => {
                const secret = secrets[key];
                const reqFlag = secret.required ? ' \x1b[31m(required)\x1b[0m' : '';
                console.log('  •', key + reqFlag);
                if (secret.description) {
                    console.log('    💬', secret.description);
                }
            });
        } else {
            console.log('  No secrets defined');
        }
        console.log('');
        
        // Show variables
        console.log('\x1b[32m🌍 Variables:\x1b[0m');
        const variables = data.variables || {};
        const variableKeys = Object.keys(variables);
        if (variableKeys.length > 0) {
            variableKeys.forEach(key => {
                const variable = variables[key];
                console.log('  •', key + '=' + (variable.value || ''));
                if (variable.description) {
                    console.log('    💬', variable.description);
                }
            });
        } else {
            console.log('  No variables defined');
        }
    } catch (error) {
        console.error('Error parsing YAML:', error.message);
        process.exit(1);
    }
    " 2>/dev/null
}

# Main execution
case "${1:-sync}" in
    "init")
        echo -e "${BLUE}🚀 Initializing YAML configuration file...${NC}"
        create_template
        echo ""
        echo -e "${GREEN}✅ Template file created: $CONFIG_FILE${NC}"
        echo -e "${YELLOW}📝 Edit the file with your actual values, then run:${NC}"
        echo -e "  ${BLUE}./sync-github-config.sh validate${NC}  # Check configuration"
        echo -e "  ${BLUE}./sync-github-config.sh sync${NC}      # Upload to GitHub"
        ;;
    "sync")
        if [ ! -f "$CONFIG_FILE" ]; then
            echo -e "${RED}Configuration file not found: $CONFIG_FILE${NC}"
            echo -e "${YELLOW}Run: $0 init${NC}"
            exit 1
        fi
        validate_config
        echo ""
        sync_secrets
        echo ""
        sync_variables
        echo ""
        sync_environments
        echo ""
        echo -e "${GREEN}🎉 Configuration sync completed!${NC}"
        ;;
    "validate")
        if [ ! -f "$CONFIG_FILE" ]; then
            echo -e "${RED}Configuration file not found: $CONFIG_FILE${NC}"
            echo -e "${YELLOW}Run: $0 init${NC}"
            exit 1
        fi
        validate_config
        ;;
    "show"|"config")
        show_config
        ;;
    "list")
        list_current
        ;;
    "help"|"-h"|"--help")
        echo -e "${BLUE}GitHub Configuration Sync Script${NC}"
        echo ""
        echo "Usage:"
        echo "  $0 [command]"
        echo ""
        echo "Commands:"
        echo -e "  ${GREEN}init${NC}      - Create template YAML configuration file"
        echo -e "  ${GREEN}sync${NC}      - Sync configuration to GitHub (default)"
        echo -e "  ${GREEN}validate${NC}  - Validate YAML configuration"
        echo -e "  ${GREEN}show${NC}      - Show configuration summary"
        echo -e "  ${GREEN}list${NC}      - List current GitHub secrets and variables"
        echo -e "  ${GREEN}help${NC}      - Show this help message"
        echo ""
        echo "Files:"
        echo -e "  ${YELLOW}$CONFIG_FILE${NC} - YAML configuration with metadata"
        echo ""
        echo "Requirements:"
        echo -e "  • GitHub CLI: ${BLUE}brew install gh${NC}"
        echo -e "  • yq (YAML processor): ${BLUE}brew install yq${NC}"
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo "Run '$0 help' for usage information"
        exit 1
        ;;
esac