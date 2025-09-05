# Core CI/CD Workflows

This directory contains the **essential workflows** for a complete CI/CD pipeline with semantic versioning.

## Why This?
1. Semantic versioning is essential for managing dependencies and communicating changes effectively. 
2. 100% Automation is possible and unblocks distributed teams.
3. Two environments is sometimes not enough to robustly test your application.
4. Convetional commits keep everyone (including AI) happy and clear with changes.
5. Version control isn't just for external consumers, but internal consumers too.
6. Automation removes human error and human _laziness_.  Why not make it easy to be clean?


## 🚀 **Quick Start**

Copy these files to your project:
```bash
cp -r CICD_TEMPLATES/.github/workflows/*.yml your-project/.github/workflows/
```

**Skip the `advanced/` directory unless you need complex branch management.**

## 📋 **Core Workflows**

### **1. Main Pipeline** (`pipe.yml`)
**The orchestrator** - coordinates all other workflows.

```yaml
# Runs on every push
# Sequence: lint → test → version → deploy → create-pr → tag
```

**Key Features:**
- Smart change detection (only test/deploy what changed)
- 4-branch promotion: develop → test → staging → main  
- Version-aware deployments
- Automatic PR creation for promotion

### **2. Version Generation** (`job.version.yml`)
**The brain** - determines semantic versions from commit messages.

```bash
# Example commits:
git commit -m "feat: add user login"     # → Minor version bump  
git commit -m "fix: resolve crash"       # → Patch version bump
git commit -m "feat!: new API breaking"  # → Major version bump
```

**Outputs:** `v1.2.3` format versions for use in other jobs.

### **3. Change Detection** (`job.changes.yml`)  
**The optimizer** - determines which parts of your codebase changed.

```yaml
# Only runs tests/deployments for:
api: true    # if apps/api/** changed
web: true    # if apps/web/** changed  
libs: true   # if libs/** changed
cicd: true   # if .github/workflows/** changed
```

**Smart Logic:** Always deploys everything on test/staging/main branches.

### **4. Environment Setup** (`job.env-check.yml`)
**The configurator** - sets environment variables based on branch.

```yaml
develop  → PROJECT_ID_DEVELOP, BUCKET_DEVELOP
test     → PROJECT_ID_TEST, BUCKET_TEST  
staging  → PROJECT_ID_STAGING, BUCKET_STAGING
main     → PROJECT_ID_PROD, BUCKET_PROD
```

### **5. Git Tagging** (`job.tag.yml`)
**The tagger** - creates version tags in git.

```bash
# Creates tags like: v1.2.3
# Only runs on develop branch
# Prevents duplicate tags
```

### **6. Application Tests** (`job.app.*.test.yml`)
**The validators** - run tests for each application.

- **API Test**: Node.js + Vitest + health check
- **Web Test**: Vite + Vitest + build validation

### **7. Application Deployments** (`job.app.*.deploy.yml`)  
**The deployers** - deploy applications with version info.

- **API Deploy**: Shows version injection into package.json
- **Web Deploy**: Shows environment variables in Vite build

### **8. PR Creation** (`job.create-pr.yml`)
**The promoter** - creates PRs for branch promotion.

```bash
develop → test     (auto PR)
test → staging     (auto PR)  
staging → main     (auto PR)
```

## 🔧 **Required Repository Setup**

### **Repository Variables**
```bash
PROJECT_ID_DEVELOP=your-develop-project  
PROJECT_ID_TEST=your-test-project
PROJECT_ID_STAGING=your-staging-project
PROJECT_ID_PROD=your-production-project

WEB_STORAGE_DEVELOP=your-develop-bucket
WEB_STORAGE_TEST=your-test-bucket  
WEB_STORAGE_STAGING=your-staging-bucket
WEB_STORAGE_PROD=your-production-bucket
```

### **Repository Secrets**
```bash
GCP_CREDENTIALS=your-service-account-json  # (if using GCP)
NPM_TOKEN=your-npm-token                   # (if publishing packages)
```

## 📁 **Expected Project Structure**

```
your-project/
├── apps/
│   ├── api/          # Node.js backend
│   └── web/          # Vite frontend  
├── libs/             # Shared libraries
└── .github/
    └── workflows/    # These workflow files
```

## 🎯 **How Version Numbers Flow**

1. **Commits** determine version:
   ```bash
   feat: new feature     → v1.1.0 (minor)
   fix: bug fix         → v1.0.1 (patch)
   feat!: breaking      → v2.0.0 (major)
   ```

2. **Version** gets used in:
   - API deployment (updates package.json)
   - Web deployment (sets VITE_VERSION env var)
   - Git tag creation
   - PR titles and descriptions

3. **Example deployment**:
   ```bash
   echo "Deploying API version v1.2.3"
   npm version v1.2.3 --no-git-tag-version
   ```

## ⚡ **Advanced Workflows**

For complex scenarios, see `advanced/` directory:
- Fast-forward merging with temporary branches
- PR title validation  
- Squash commit naming

**Start with core workflows first** - add advanced features only when needed.
