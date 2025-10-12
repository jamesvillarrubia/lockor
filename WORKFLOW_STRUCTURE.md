# 🚀 New CI/CD Workflow Structure

## 📋 Workflow Triggers

### 1. **Push to Branch** (main, develop)
```
Push to main/develop
├── 🧪 Test Suite (unit + integration + e2e)
└── 🔧 Lint & Format Check
```

### 2. **Create/Update PR**
```
PR opened/synchronized
├── 📝 PR Title Format Check
├── 🧪 Test Suite (unit + integration + e2e)
└── 🔧 Lint & Format Check
```

### 3. **Merge PR**
```
PR merged to main
├── 🔍 Change Detection
├── 🧪 Test Suite (unit + integration + e2e)
├── 🔧 Lint & Format Check
├── 🔒 Security Analysis
├── 📦 Build & Package
├── 🏷️ Versioning & Tagging
├── 🚀 Publishing
└── ✅ Squash Commit Validation
```

## 🎯 Key Benefits

- ✅ **No duplicate execution** - each workflow has specific triggers
- ✅ **Fast feedback** - tests/lint run on every push and PR update
- ✅ **Full pipeline** - complete CI/CD only runs on merge
- ✅ **Resource efficient** - targeted execution based on event type
- ✅ **Comprehensive coverage** - all scenarios covered

## 📊 Execution Flow

| Event | Tests | Lint | Full Pipeline |
|-------|-------|------|---------------|
| Push to branch | ✅ | ✅ | ❌ |
| PR opened | ✅ | ✅ | ❌ |
| PR updated | ✅ | ✅ | ❌ |
| PR merged | ✅ | ✅ | ✅ |
| PR closed (not merged) | ❌ | ❌ | ❌ |

## 🔧 Workflow Files

- `pipe.yml` - Main CI/CD pipeline (PR merge only)
- `job.build.test.yml` - Test suite (push + PR open/sync)
- `job.build.lint.yml` - Lint & format (push + PR open/sync)
- `job.pr.title-check.yml` - PR title validation (PR open/sync)
- `job.pr.squash-enforce.yml` - Squash commit validation (PR merge)
