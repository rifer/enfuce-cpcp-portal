# Project Initialization Guide

## Quick Start

Welcome to the Enfuce Card Program Configuration Portal (CPCP). This guide will help you set up the development environment and understand the project structure.

## Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- npm (comes with Node.js)
- Git
- A code editor (VS Code recommended)

## Initial Setup

### 1. Clone and Install

```bash
# Navigate to project directory (if not already there)
cd /Users/rodri/Desktop/enfuce-cpcp-portal

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at: `http://localhost:5173`

### 2. Environment Variables

For local development, you typically don't need any environment variables. The app works in localStorage mode.

For production/Vercel deployment, these are automatically configured:
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob Storage (auto-provided)
- `ANTHROPIC_API_KEY` - For AI validation (set in Vercel/GitHub Secrets)

### 3. Verify Setup

```bash
# Run local EVALS to verify everything works
npm run evals:local
```

You should see test results showing validation accuracy around 90%+.

## Project Structure

```
enfuce-cpcp-portal/
├── api/                          # Vercel serverless API endpoints
│   ├── ai-validate.js           # AI-powered field validation (Local + Anthropic)
│   ├── analytics.js             # A/B test analytics tracking
│   ├── card-program.js          # Card program CRUD operations
│   ├── events.js                # Event tracking
│   ├── feedback.js              # User feedback collection
│   └── configurations/          # Card program configurations
│       ├── [id].json           # Individual program configs
│       └── list.json            # Program list index
├── src/                         # React frontend source
│   ├── EnfucePortal.jsx        # Main portal component
│   └── assets/                  # Static assets
├── evals/                       # AI validation testing
│   ├── run-evals.js            # EVALS test runner
│   ├── test-cases.json         # 125 test cases for validation
│   ├── results/                # EVALS results (timestamped + latest)
│   └── failures/               # Failure reports (txt + json)
├── .github/workflows/           # CI/CD automation
│   └── scheduled-evals.yml     # 4x daily automated EVALS
├── docs/                        # Documentation
│   └── Enfuce_CPCP_PRD.docx    # Product requirements
├── public/                      # Static files
├── dist/                        # Build output (git-ignored)
└── Documentation files:
    ├── README.md               # Main project README
    ├── API_README.md           # API documentation
    ├── AI_WIZARD_FEATURES.md   # Conversational wizard docs
    ├── DEPLOYMENT.md           # Deployment guide
    ├── AB_TEST_DOCUMENTATION.md # A/B testing setup
    ├── ANALYTICS_SETUP.md      # Analytics implementation
    └── ADDING_OPTIONS.md       # How to add new options
```

## Key Concepts

### 1. Dual Wizard System

The portal has **two** ways to configure card programs:

**A) Traditional Wizard** (5-step form)
- Program basics → Card config → Spend controls → Design → Review
- Classic form-based flow

**B) Conversational Wizard** (AI-powered chat)
- Natural language input
- Guided conversation flow
- Same configuration as traditional wizard
- Uses `api/ai-validate.js` for validation

### 2. AI Validation (Two Providers)

The chat wizard supports **dual AI providers**:

**Local Provider** (Default - No API key needed)
- Rule-based validation
- Fuzzy matching for natural language
- Fast, zero-cost
- 90%+ accuracy

**Anthropic Provider** (Optional - Requires API key)
- Claude Sonnet 4.5 API
- Natural language understanding
- Handles complex inputs
- 82-90% accuracy

### 3. EVALS System

Automated testing for AI validation quality:

```bash
# Run EVALS locally (no API key needed)
npm run evals:local

# Run EVALS with Anthropic (requires ANTHROPIC_API_KEY)
npm run evals:anthropic

# Run both providers
npm run evals:both
```

**What EVALS test:**
- 125 test cases covering all conversation steps
- Greeting detection
- Field validation (name, type, funding, limits, colors, etc.)
- Skip command handling
- Natural language understanding
- Edge cases (typos, abbreviations, etc.)

**Results:**
- Timestamped files: `evals/results/eval-results-[timestamp].json`
- Latest results: `evals/results/latest-[provider].json`
- Failure reports: `evals/failures/failures-[provider].txt|json`

**Automated Monitoring:**
- GitHub Actions runs EVALS 4x daily (00:00, 06:00, 12:00, 18:00 UTC)
- Creates GitHub issues if failures detected
- Workflow: `.github/workflows/scheduled-evals.yml`

### 4. A/B Testing

The portal includes a 2x2 factorial A/B test:

**Variables:**
1. CTA Placement: Header (A) vs Dashboard (B)
2. Pricing Display: Live/Dynamic vs Final Summary

**Analytics:**
- Impression → Click → Purchase funnel
- Per-variant conversion rates
- Persistent storage via Vercel Blob (in production)
- View analytics: `http://localhost:5173/analytics`

## Development Workflow

### Daily Development

```bash
# Start dev server
npm run dev

# Make changes to src/EnfucePortal.jsx or api/*.js

# Test locally
# Navigate to http://localhost:5173
```

### Testing AI Validation

```bash
# Test local provider
curl -X POST 'http://localhost:5173/api/ai-validate' \
  -H 'Content-Type: application/json' \
  -d '{
    "provider": "local",
    "action": "validate",
    "context": {
      "current_question": {"field": "program_name", "type": "text", "minLength": 3},
      "user_input": "Corporate Travel Card",
      "conversation_history": [],
      "collected_data": {}
    }
  }'
```

### Running EVALS

```bash
# Local provider (no API key needed)
npm run evals:local

# Anthropic provider (needs ANTHROPIC_API_KEY env var)
export ANTHROPIC_API_KEY='sk-ant-...'
npm run evals:anthropic

# Test against production
API_URL=https://enfuce-cpcp-portal.vercel.app npm run evals:local
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "Add my feature"

# Push to GitHub
git push origin feature/my-feature

# Vercel will auto-deploy preview
# Check preview URL in GitHub PR
```

## Deployment

### Vercel (Production)

The project is configured for Vercel deployment:

1. **Automatic**: Push to `master` triggers deployment
2. **Manual**: Run `vercel --prod` (requires Vercel CLI)

**Environment Variables** (set in Vercel dashboard):
- `ANTHROPIC_API_KEY` - For AI validation (optional, for Anthropic provider)
- `BLOB_READ_WRITE_TOKEN` - Auto-provided by Vercel

**Deployment Triggers:**
- Push to `master` branch
- Pull request (creates preview deployment)
- Manual trigger via Vercel dashboard

**Post-Deployment:**
- EVALS run automatically (if configured)
- Check GitHub Actions for EVALS results
- Production URL: `https://enfuce-cpcp-portal.vercel.app`

### GitHub Actions (CI/CD)

**Scheduled EVALS:**
- Runs 4 times per day (00:00, 06:00, 12:00, 18:00 UTC)
- Tests both Local and Anthropic providers
- Creates GitHub issue if failures detected
- Uploads EVALS results as artifacts

**Manual Trigger:**
```bash
# Trigger via GitHub CLI
gh workflow run scheduled-evals.yml

# Or via GitHub web UI:
# Actions → Scheduled EVALS → Run workflow
```

## Common Tasks

### Adding New Conversation Questions

See `ADDING_OPTIONS.md` for detailed instructions.

**Quick steps:**
1. Add question to `src/EnfucePortal.jsx` conversation steps (line ~1239)
2. Add validation logic in `api/ai-validate.js`
3. Add test cases to `evals/test-cases.json`
4. Run EVALS to verify: `npm run evals:local`

### Debugging AI Validation

```bash
# Enable debug mode in EVALS
node evals/run-evals.js

# Look for debug output:
# [DEBUG] API response has provider_used: local
# [DEBUG] Result provider set to: local
```

**Common issues:**
- Provider not switching: Check `runTestCase()` in `evals/run-evals.js` line 602
- Validation failing: Check `validateFieldLocally()` in `api/ai-validate.js`
- EVALS timeout: Vercel cold start (wait 10 seconds, retry)

### Viewing EVALS Results

```bash
# View latest local results
cat evals/results/latest-local.json | jq

# View failures only
cat evals/failures/failures-local.txt

# View specific test run
cat evals/results/eval-results-2025-12-10T09-20-21-050Z.json | jq
```

### Fixing EVALS Failures

1. **Review failure report:**
   ```bash
   cat evals/failures/failures-local.txt
   ```

2. **Identify issue:**
   - Wrong expected value in test case?
   - Bug in validation logic?
   - Natural language not recognized?

3. **Fix:**
   - Update `api/ai-validate.js` for logic bugs
   - Update `evals/test-cases.json` for test issues
   - Add fuzzy matching keywords for natural language

4. **Verify fix:**
   ```bash
   npm run evals:local
   ```

## Useful Commands

### Development
```bash
npm run dev              # Start dev server (port 5173)
npm run build           # Build for production
npm run preview         # Preview production build
npm run lint            # Run ESLint
```

### EVALS
```bash
npm run evals           # Run default EVALS (local provider)
npm run evals:local     # Run local provider EVALS
npm run evals:anthropic # Run Anthropic provider EVALS (needs API key)
npm run evals:both      # Run both providers sequentially
```

### Git
```bash
git status              # Check status
git log --oneline -10   # View recent commits
git diff                # View changes
```

### Vercel
```bash
vercel                  # Deploy preview
vercel --prod          # Deploy to production
vercel logs            # View deployment logs
```

### GitHub CLI
```bash
gh pr list             # List pull requests
gh pr create           # Create PR
gh run list            # List workflow runs
gh run watch [ID]      # Watch workflow run
gh issue list --label evals-failure  # List EVALS failure issues
```

## Troubleshooting

### EVALS Not Running

**Symptom:** "API health check failed"

**Solutions:**
1. Check API is running: `curl http://localhost:5173/api/ai-validate`
2. Wait for Vercel cold start (add 10s delay in EVALS)
3. Verify API_URL environment variable

### Anthropic Provider Not Working

**Symptom:** All tests show "local" provider

**Solutions:**
1. Check `ANTHROPIC_API_KEY` is set
2. Verify `runTestCase()` passes provider parameter (line 602)
3. Check API response has `provider_used` field

### EVALS Showing Failures

**Symptom:** Tests failing that should pass

**Solutions:**
1. Check if code is deployed (production lag)
2. Review failure details: `cat evals/failures/failures-local.txt`
3. Compare expected vs actual values
4. Update validation logic or test cases

### Deployment Not Triggering

**Symptom:** Push to master doesn't deploy

**Solutions:**
1. Check Vercel dashboard for deployment status
2. Verify GitHub integration is active
3. Check for build errors in Vercel logs
4. Force deployment: `vercel --prod`

## Resources

### Documentation
- [Main README](README.md) - Project overview
- [API Documentation](API_README.md) - API endpoints
- [AI Wizard Features](AI_WIZARD_FEATURES.md) - Conversational wizard
- [Deployment Guide](DEPLOYMENT.md) - Deployment instructions
- [Adding Options](ADDING_OPTIONS.md) - How to extend the wizard

### External Links
- [Vercel Dashboard](https://vercel.com/dashboard)
- [GitHub Repository](https://github.com/rifer/enfuce-cpcp-portal)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

### Support
- GitHub Issues: https://github.com/rifer/enfuce-cpcp-portal/issues
- Enfuce Documentation: [Internal wiki/docs]

## Next Steps

After setup, try:

1. **Explore the portal:**
   - Open http://localhost:5173
   - Try both Traditional and Conversational wizards
   - View existing card programs

2. **Test AI validation:**
   - Run `npm run evals:local`
   - Review results in `evals/results/latest-local.json`

3. **Make a change:**
   - Add a new conversation question
   - Update validation logic
   - Run EVALS to verify
   - Commit and push

4. **Deploy:**
   - Push to master
   - Watch Vercel deployment
   - Test production: https://enfuce-cpcp-portal.vercel.app

## Project Health

**Current Status:**
- EVALS Accuracy: 90.4% (Local), 82.4% (Anthropic)
- Automated Monitoring: Active (4x daily)
- Production: https://enfuce-cpcp-portal.vercel.app
- Last Deploy: Auto-deployed on push to master

**Recent Improvements:**
- Fixed color validation (hex codes, case sensitivity)
- Added 37 new color test cases
- Fixed natural language recognition for card designs
- Improved skip command handling
- Fixed GitHub Actions permissions for issue creation

---

**Questions?** Check the documentation files or open a GitHub issue.
