# GitHub Actions Configuration

This repository includes comprehensive GitHub Actions workflows for continuous integration, code quality, and security monitoring.

## Workflows

### 1. CI - Syntax Check and Quality Assurance (`ci.yml`)

**Triggers:** Push to `main`/`develop` branches, Pull Requests
**Purpose:** Comprehensive syntax checking and quality assurance

**Jobs:**

- **Frontend Checks:** TypeScript compilation, ESLint, Build verification, Dependency analysis
- **Backend Checks:** JavaScript syntax validation, Security audit, Dependency analysis
- **Code Quality:** Prettier formatting checks, TODO/FIXME detection
- **Security Checks:** Security audits, Hardcoded secrets detection
- **Summary:** Consolidated results reporting

### 2. Pull Request Checks (`pr-checks.yml`)

**Triggers:** Pull request events
**Purpose:** Additional PR-specific quality checks

**Features:**

- Commit message format validation
- Large file detection
- Sensitive file detection
- Automated PR comments with check results

### 3. Security and Dependency Monitoring (`security-monitor.yml`)

**Triggers:** Weekly schedule (Mondays 9 AM UTC), Manual dispatch
**Purpose:** Regular security and dependency monitoring

**Features:**

- Security vulnerability audits
- Outdated package detection
- Automated issue creation for vulnerabilities
- Security report artifacts

### 4. Auto Format Code (`auto-format.yml`)

**Triggers:** Manual dispatch only
**Purpose:** Automatically format code using Prettier

**Features:**

- Frontend and backend code formatting
- Automatic commit of formatting changes
- Safe manual-only execution

## Setup Requirements

### Frontend

- Node.js 18+
- npm dependencies installed
- TypeScript configuration
- ESLint configuration

### Backend

- Node.js 18+
- npm dependencies installed
- JavaScript syntax validation

## Code Quality Tools

- **ESLint:** JavaScript/TypeScript linting
- **Prettier:** Code formatting
- **TypeScript:** Type checking
- **npm audit:** Security vulnerability scanning
- **depcheck:** Unused dependency detection

## Usage

### Automatic Triggers

- All syntax checks run automatically on push/PR
- Security monitoring runs weekly
- PR checks run on all pull request events

### Manual Triggers

- Auto-formatting can be triggered manually via GitHub Actions tab
- Security monitoring can be run on-demand

## Configuration Files

- `.prettierrc.json` - Prettier formatting configuration
- `.prettierignore` - Files to ignore during formatting
- `eslint.config.js` - ESLint configuration (already exists)
- Package.json scripts updated with quality check commands

## Benefits

✅ **Automated Quality Assurance:** Every code change is automatically validated  
✅ **Security Monitoring:** Regular security audits and vulnerability detection  
✅ **Consistent Formatting:** Automated code formatting standards  
✅ **Pull Request Quality:** Enhanced PR review process with automated checks  
✅ **Dependency Management:** Monitoring of outdated and vulnerable dependencies  
✅ **Comprehensive Reporting:** Detailed reports and summaries for all checks

## Getting Started

1. Push code to trigger the first CI run
2. Create a pull request to see PR-specific checks
3. Review any issues reported in the Actions tab
4. Use manual auto-formatting if needed

All workflows are configured to provide detailed feedback and won't break your development process - they're designed to help maintain code quality while being developer-friendly.
