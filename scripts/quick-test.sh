#!/bin/bash

###############################################################################
# QUICK PIPELINE TEST SCRIPT
###############################################################################
#
# A simplified version of the pipeline test script for quick testing.
# Makes a small change and commits it automatically.
#
# USAGE:
#   ./scripts/quick-test.sh
#
###############################################################################

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Quick Pipeline Test${NC}"

# Check branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "develop" && "$CURRENT_BRANCH" != "main" ]]; then
  echo "❌ Must be on develop or main branch (currently on: $CURRENT_BRANCH)"
  exit 1
fi

# Make the change
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
TEST_COMMENT="// Pipeline test - $TIMESTAMP"

# Add test comment to extension.ts
if grep -q "Pipeline test" src/extension.ts; then
  sed -i.tmp "s|// Pipeline test - .*|$TEST_COMMENT|" src/extension.ts
  rm -f src/extension.ts.tmp
else
  # Add after first comment block
  awk '
    /^\/\*.*\*\/$/ { 
      print $0
      print "// Pipeline test - '"$TIMESTAMP"'"
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
      print "// Pipeline test - '"$TIMESTAMP"'"
      next 
    }
    !in_comment && /^\/\// { 
      print $0
      print "// Pipeline test - '"$TIMESTAMP"'"
      next 
    }
    { print $0 }
  ' src/extension.ts > src/extension.ts.tmp && mv src/extension.ts.tmp src/extension.ts
fi

# Commit and push
git add src/extension.ts
git commit -m "test(ci): quick pipeline test - $TIMESTAMP"
git push origin "$CURRENT_BRANCH"

echo -e "${GREEN}✅ Pipeline test triggered!${NC}"
echo -e "${BLUE}📊 Check GitHub Actions to monitor progress${NC}"
