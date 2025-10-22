# GitHub Setup Guide for E2E Testing

This guide will help you set up your repository on GitHub to enable automated E2E testing with Playwright.

## 📋 Prerequisites

- GitHub account
- Git installed locally or on Replit
- Repository created on GitHub (or ready to create one)

## 🚀 Step-by-Step Setup

### 1. Initialize Git Repository (if not already done)

```bash
# Check if git is already initialized
git status

# If not, initialize git
git init

# Add your files
git add .

# Create initial commit
git commit -m "Initial commit with Playwright tests"
```

### 2. Connect to GitHub Repository

#### Option A: Create New Repository on GitHub

1. Go to [GitHub](https://github.com) and sign in
2. Click the **+** icon in top right → **New repository**
3. Name your repository (e.g., `smartscheduler`)
4. Choose **Public** or **Private**
5. **Do NOT** initialize with README, .gitignore, or license
6. Click **Create repository**

#### Option B: Use Existing Repository

Skip to step 3 if you already have a repository.

### 3. Link Local Repository to GitHub

```bash
# Add GitHub remote (replace with your repository URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Verify remote was added
git remote -v

# Push to GitHub
git branch -M main
git push -u origin main
```

### 4. Enable GitHub Actions

GitHub Actions is enabled by default for public repositories. For private repos:

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Click **Actions** → **General** in left sidebar
4. Under **Actions permissions**, select:
   - ✅ "Allow all actions and reusable workflows"
5. Click **Save**

### 5. Verify Workflows Are Detected

1. Go to **Actions** tab in your repository
2. You should see two workflows:
   - **Playwright Tests**
   - **Scheduled E2E Tests**

If you don't see them, ensure `.github/workflows/` directory was pushed correctly.

### 6. Configure Secrets (if needed)

If your tests require secrets (API keys, etc.):

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add secrets like:
   - `STRIPE_SECRET_KEY` (if testing Stripe)
   - `GOOGLE_CLIENT_ID` (if testing OAuth)
   - `SMTP_PASSWORD` (if testing email)

**Note:** The workflows already set up `DATABASE_URL` and `SESSION_SECRET` automatically.

### 7. Test the Workflows

#### Trigger by Push

```bash
# Make a small change
echo "# SmartScheduler" > README.md
git add README.md
git commit -m "Add README"
git push origin main
```

Then:
1. Go to **Actions** tab
2. Watch the **Playwright Tests** workflow run
3. Click on the workflow run to see details

#### Trigger Manually

1. Go to **Actions** tab
2. Click **Scheduled E2E Tests**
3. Click **Run workflow** dropdown
4. Select branch and browser (or all)
5. Click green **Run workflow** button

### 8. View Test Results

After a workflow completes:

1. Click on the workflow run in **Actions** tab
2. Scroll down to **Artifacts** section
3. Download **playwright-report.zip**
4. Unzip and open `index.html` in your browser

### 9. Set Up Branch Protection (Recommended)

Require tests to pass before merging:

1. Go to **Settings** → **Branches**
2. Click **Add rule** under "Branch protection rules"
3. Branch name pattern: `main`
4. Check these options:
   - ✅ **Require status checks to pass before merging**
   - ✅ Search for and select: `test`
   - ✅ **Require branches to be up to date before merging**
5. Click **Create**

Now PRs cannot be merged unless tests pass!

### 10. Add Status Badge to README

Create/update your `README.md`:

```markdown
# SmartScheduler

![Playwright Tests](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/playwright.yml/badge.svg)

A full-stack scheduling/calendar application.

## Features
- Calendar management
- Booking links
- Team scheduling
- And more...

## Testing

This project includes comprehensive E2E tests. See [e2e/README.md](e2e/README.md) for details.
```

Replace `YOUR_USERNAME` and `YOUR_REPO` with your actual values.

## 🔧 Troubleshooting

### Workflow doesn't run

**Problem:** Pushed code but workflow didn't trigger

**Solution:**
- Check that `.github/workflows/` directory exists
- Verify YAML files are valid (no syntax errors)
- Check Actions is enabled (Settings → Actions)

### Tests fail in CI but pass locally

**Problem:** Tests work on your machine but fail in GitHub Actions

**Solution:**
- Check environment variables are set correctly
- Database connection might be failing
- Look at workflow logs for specific errors
- Verify `db:push` step succeeded

### Database connection errors

**Problem:** Tests can't connect to PostgreSQL

**Solution:**
- The workflow uses a PostgreSQL service container
- Connection string is: `postgresql://testuser:testpassword@localhost:5432/smartscheduler_test`
- Check the `services` section in workflow YAML
- Ensure database migrations ran successfully

### Artifacts not appearing

**Problem:** Can't find test reports after workflow runs

**Solution:**
- Artifacts only appear if workflow completes (even with failures)
- Look under "Artifacts" section at bottom of workflow run
- Reports are kept for 30 days
- Check that `upload-artifact` steps ran

### PR comment action not working

**Problem:** Test results not posted to PR

**Solution:**
- Ensure workflow has `pull_request` trigger
- Check the `daun/playwright-report-comment` action is installed
- May need to grant additional permissions to GITHUB_TOKEN
- Go to Settings → Actions → General → Workflow permissions
- Select "Read and write permissions"

## 📊 Understanding Workflow Results

### Test Summary

After each run, you'll see:
- **Total tests:** 126 (42 tests × 3 browsers)
- **Pass rate:** Percentage of passing tests
- **Duration:** How long tests took
- **Flaky tests:** Tests that failed on retry

### Test Report

The HTML report includes:
- ✅ Test results by file and browser
- 📸 Screenshots of failures
- 🎥 Video recordings (on failure)
- 📝 Step-by-step traces
- ⏱️ Performance metrics

## 🎉 You're All Set!

Your E2E tests will now run automatically on every push and PR. Monitor the Actions tab to see test results and catch regressions early!

## 📚 Next Steps

1. **Write more tests** - Add tests for new features as you build them
2. **Monitor flaky tests** - Fix tests that fail intermittently
3. **Optimize test speed** - Parallelize tests, reduce waits
4. **Add test coverage** - Track which parts of your app are tested
5. **Set up notifications** - Get Slack/email alerts on test failures

## 🆘 Need Help?

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Playwright Documentation](https://playwright.dev)
- [GitHub Actions for Playwright](https://playwright.dev/docs/ci)
