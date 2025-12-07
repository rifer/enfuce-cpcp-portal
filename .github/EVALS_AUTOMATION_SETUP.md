# EVALS Automation Setup Guide

This guide explains how the automated EVALS monitoring works and how to configure email notifications.

## 🤖 What's Automated

### Scheduled Runs (4x Daily)
The system automatically runs EVALS **4 times per day** at:
- **00:00 UTC** (midnight)
- **06:00 UTC** (6am)
- **12:00 UTC** (noon)
- **18:00 UTC** (6pm)

### What Happens Each Run

1. ✅ Tests **LOCAL provider** validation
2. ✅ Tests **ANTHROPIC provider** validation
3. ✅ Generates failure reports (if any)
4. ✅ Creates/updates GitHub Issue with details
5. ✅ Sends email notification (via GitHub)
6. ✅ Uploads artifacts for download

## 📧 Email Notification Setup

To receive email notifications when EVALS fail:

### Step 1: Enable Repository Watching

1. Go to the repository on GitHub
2. Click the **"Watch"** button (top right)
3. Select **"Custom"**
4. Check ☑️ **"Issues"**
5. Click **"Apply"**

### Step 2: Configure Email Preferences

1. Go to GitHub Settings → Notifications
2. Ensure **"Email"** is enabled
3. Set notification delivery:
   - ☑️ Participating
   - ☑️ Watching
   - ☑️ Issues

### Step 3: Verify Email Address

Make sure your GitHub email is verified:
- GitHub Settings → Emails
- Verify your primary email

## 🔧 Required Secrets

Make sure these secrets are configured in your repository:

### GitHub Repository Secrets

Go to: **Repository Settings → Secrets and variables → Actions**

Add these secrets:

| Secret Name | Description | Required |
|------------|-------------|----------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | ✅ Yes |
| `PRODUCTION_URL` | Production URL (optional) | No |

## 📊 What You'll Receive

When EVALS fail, you'll get an email like:

```
Subject: [enfuce-cpcp-portal] 🚨 EVALS Failures - 2025-12-05 (#123)

4 tests failed in scheduled EVALS run.

🔵 Local Provider: 72/76 passed (94.7%)
🟢 Anthropic Provider: 68/76 passed (89.5%)

View details: https://github.com/.../issues/123
```

## 🚀 How to Fix Issues

When you receive an email notification:

### Option 1: One-Command Fix (Recommended)

1. Open Claude Code
2. Type: `fix issue #123` (replace with actual issue number)
3. Review the automated PR
4. Merge if it looks good

### Option 2: Manual Review

1. Click the link in the email
2. Review failure details in the issue
3. Download artifacts for full reports
4. Fix manually and push

## 📁 Artifacts

Each run uploads artifacts containing:

- `latest-local.json` - Full results for local provider
- `latest-anthropic.json` - Full results for anthropic provider
- `failures-local.txt` - Easy copy/paste failures (local)
- `failures-anthropic.txt` - Easy copy/paste failures (anthropic)
- `failures-*.json` - Machine-readable failure details

**Access artifacts:** Go to the workflow run → Artifacts section

## ⚙️ Manual Trigger

You can manually trigger a run anytime:

1. Go to: **Actions → Scheduled EVALS (4x Daily)**
2. Click: **"Run workflow"**
3. (Optional) Enter custom API URL
4. Click: **"Run workflow"**

## 🔄 Issue Management

- **New failures:** Creates a new issue with today's date
- **Ongoing failures:** Updates existing issue with new run data
- **Labels:** Issues are tagged with `evals-failure` and `automated`
- **Auto-close:** Issues do NOT auto-close (close manually when fixed)

## 🎯 Best Practices

1. **Check email daily** for failure notifications
2. **Act quickly** on failures to maintain quality
3. **Review artifacts** for detailed failure analysis
4. **Use Claude Code** for quick fixes
5. **Close issues** manually after confirming fixes work

## 📈 Monitoring

Track your EVALS health over time:

- **Issues tab:** Filter by label `evals-failure`
- **Actions tab:** View run history and trends
- **Artifacts:** Download historical results

## 🆘 Troubleshooting

### Not receiving emails?

1. Check GitHub notification settings
2. Verify repository is being "Watched"
3. Check spam folder
4. Verify email in GitHub settings

### Workflow not running?

1. Check Actions tab for errors
2. Verify secrets are configured
3. Check cron schedule (may take time to start)
4. Try manual trigger to test

### ANTHROPIC tests always fail?

1. Verify `ANTHROPIC_API_KEY` secret is set
2. Check API key has sufficient credits
3. Review workflow logs for API errors

## 📝 Notes

- **Token usage:** ~4 Anthropic API calls per day
- **Cost:** ~$0.024/day for Anthropic tests (76 tests × 4 runs)
- **Retention:** Artifacts kept for 30 days
- **Timezone:** All times in UTC

## 🔗 Related Workflows

- `evals.yml` - Runs on deployments (production testing)
- `scheduled-evals.yml` - This workflow (4x daily monitoring)

---

**Questions?** Create an issue or ask in Claude Code!
