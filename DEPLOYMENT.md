# Deployment Guide

Complete guide for deploying the Enfuce CPCP Portal with database-driven options and EVALS.

## Prerequisites

- [x] Vercel account
- [x] Supabase project
- [x] GitHub repository (for CI/CD)

## Step 1: Set Up Supabase

### 1.1 Run Initial Schema
If you haven't already, run the initial schema:
```sql
-- In Supabase SQL Editor
-- Copy and paste: supabase/schema.sql
```

### 1.2 Run Lookup Tables Migration
Add dynamic options support:
```sql
-- In Supabase SQL Editor
-- Copy and paste: supabase/migrations/002_create_lookup_tables.sql
```

This creates:
- ✅ `card_schemes` - Including **American Express**, Discover, UnionPay, JCB
- ✅ `program_types` - Including healthcare, education
- ✅ `funding_models` - Including charge cards
- ✅ `form_factors` - Physical, virtual, tokenized
- ✅ `currencies` - 10 major currencies
- ✅ `configuration_statuses` - All status types

### 1.3 Verify Data
```sql
-- Check all schemes are inserted
SELECT code, display_name, is_active
FROM card_schemes
ORDER BY sort_order;

-- Should see: Visa, Mastercard, American Express, Discover, UnionPay, JCB
```

### 1.4 Get Credentials
From Supabase Project Settings → API:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

## Step 2: Configure Vercel

### 2.1 Add Environment Variables
In Vercel Dashboard → Project Settings → Environment Variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-key  # Optional
```

### 2.2 Deploy
```bash
git push origin main
```

Vercel automatically deploys on push.

## Step 3: Set Up CI/CD with EVALS

### Option A: GitHub Actions (Recommended)

Already configured in `.github/workflows/evals.yml`!

**What it does:**
- ✅ Runs EVALS on every PR
- ✅ Runs on every push to main
- ✅ Runs after Vercel deployment
- ✅ Posts results as PR comment
- ✅ Fails if accuracy < 85%

**Enable it:**
1. Push code to GitHub
2. GitHub Actions automatically runs
3. View results in Actions tab

**Manual trigger:**
```bash
# Via GitHub UI: Actions → Run EVALS → Run workflow
# Specify API URL and AI provider
```

### Option B: Vercel Build Hooks

Add to `vercel.json`:
```json
{
  "buildCommand": "npm run build && npm run evals",
  "env": {
    "API_URL": "https://your-preview-url.vercel.app"
  }
}
```

**Note:** This runs EVALS during build, which may slow deployments.

### Option C: Post-Deploy Webhook

Set up a webhook to run EVALS after deployment:

1. Create a webhook endpoint (separate service)
2. Configure in Vercel → Project Settings → Deploy Hooks
3. Webhook calls: `npm run evals` with deployed URL

## Step 4: Verify Deployment

### 4.1 Test Schema Endpoint
```bash
curl https://your-app.vercel.app/api/configurations/schema | jq '.schema.card_scheme.options'

# Should return:
# ["Visa", "Mastercard", "American Express", "Discover", "UnionPay", "JCB"]
```

### 4.2 Test Wizard
1. Open https://your-app.vercel.app
2. Click "Create New Program"
3. Use chat wizard
4. When asked for card scheme, verify American Express appears
5. Complete wizard and save

### 4.3 Verify in Supabase
```sql
-- Check saved configuration
SELECT program_name, card_scheme, created_at
FROM card_configurations
ORDER BY created_at DESC
LIMIT 5;

-- Should see configurations with various card schemes
```

### 4.4 Run EVALS Manually
```bash
# Against production
API_URL=https://your-app.vercel.app npm run evals

# Expected output:
# Overall: 42/45 tests passed (93.3%)
# Card schemes test should pass for American Express
```

## Step 5: Ongoing Maintenance

### Adding New Options

#### Via Supabase UI:
1. Go to Supabase → Table Editor
2. Select table (e.g., `card_schemes`)
3. Insert new row:
   - code: `Diners Club`
   - display_name: `Diners Club`
   - is_active: `true`
   - sort_order: `7`
4. Save

✅ **Immediately available in wizard!**

#### Via SQL:
```sql
-- Add Diners Club
INSERT INTO card_schemes (code, display_name, sort_order)
VALUES ('Diners Club', 'Diners Club', 7);

-- Add new program type
INSERT INTO program_types (code, display_name, description, sort_order)
VALUES ('retail', 'Retail', 'Retail store cards', 9);

-- Add new currency
INSERT INTO currencies (code, display_name, symbol, sort_order)
VALUES ('JPY', 'Japanese Yen', '¥', 11);
```

### Disabling Options

```sql
-- Disable without deleting (recommended)
UPDATE card_schemes
SET is_active = false
WHERE code = 'Discover';

-- Re-enable
UPDATE card_schemes
SET is_active = true
WHERE code = 'Discover';

-- Permanent delete (not recommended)
DELETE FROM card_schemes WHERE code = 'Discover';
```

### Monitoring EVALS

#### View Results
```bash
# Latest results
cat evals/results/latest.json | jq '.metrics'

# Specific test details
cat evals/results/latest.json | jq '.test_details[] | select(.passed == false)'
```

#### GitHub Actions Results
1. Go to GitHub → Actions tab
2. Click latest workflow run
3. Download artifacts (evals-results)
4. View JSON results

#### Set Up Alerts
Add to `.github/workflows/evals.yml`:
```yaml
- name: Send Slack notification on failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "EVALS failed! Accuracy below threshold.",
        "url": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## Troubleshooting

### Issue: Schema endpoint returns fallback options

**Symptom:** Console shows `⚠️ Supabase not configured, using fallback options`

**Solution:**
1. Check environment variables are set in Vercel
2. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are correct
3. Check Vercel logs for connection errors
4. Run migration: `supabase/migrations/002_create_lookup_tables.sql`

### Issue: American Express not showing in wizard

**Solution:**
```sql
-- Verify it's in database and active
SELECT * FROM card_schemes WHERE code = 'American Express';

-- Check wizard console logs
-- Should see: "📋 Configuration schema loaded: {...}"
-- Check: schema.card_scheme.options includes American Express
```

### Issue: EVALS failing after adding new option

**Solution:**
1. Add test case for new option in `evals/test-cases.json`:
```json
{
  "id": "scheme-amex",
  "category": "validation",
  "step": "card_scheme",
  "input": "American Express",
  "expected_validation": true,
  "expected_value": "American Express",
  "description": "American Express scheme validation"
}
```
2. Run evals: `npm run evals`

### Issue: Database connection slow

**Solution:**
- Add caching to schema endpoint
- Cache for 5 minutes in memory
- Or use Vercel Edge Config for ultra-fast reads

## Performance Optimization

### Cache Schema Response
```javascript
// In api/configurations/schema.js
let cachedSchema = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

if (Date.now() - cacheTime < CACHE_TTL && cachedSchema) {
  return res.status(200).json(cachedSchema);
}

// ... fetch from database ...
cachedSchema = { success: true, schema, ... };
cacheTime = Date.now();
```

### Vercel Edge Config (Optional)
For ultra-fast global reads:
1. Create Edge Config in Vercel
2. Store options JSON
3. Read from Edge Config instead of Supabase
4. Update Edge Config when database changes (webhook)

## Security

### Row Level Security
Already enabled in migration! Only active rows are readable.

```sql
-- View policies
SELECT * FROM pg_policies WHERE tablename = 'card_schemes';
```

### Admin UI (Future)
Build admin panel to manage options:
- Add/edit/disable card schemes
- Reorder options
- Bulk import
- Audit log

### Rate Limiting
Add to Vercel configuration:
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "X-RateLimit-Limit",
          "value": "100"
        }
      ]
    }
  ]
}
```

## Rollback Plan

### If deployment fails:

1. **Revert code:**
```bash
git revert HEAD
git push
```

2. **Revert database:**
```sql
-- Disable new lookup tables
ALTER TABLE card_schemes DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS card_schemes CASCADE;
-- ... repeat for other tables ...
```

3. **Use fallback:**
Schema endpoint automatically falls back to hardcoded values if database query fails.

## Success Checklist

- [x] Supabase migration ran successfully
- [x] American Express visible in `card_schemes` table
- [x] Vercel environment variables configured
- [x] Deployed to Vercel
- [x] Schema endpoint returns American Express
- [x] Wizard shows American Express option
- [x] Can create configuration with American Express
- [x] EVALS passing (≥85% accuracy)
- [x] GitHub Actions running on every push
- [x] PR comments showing EVALS results

---

**Questions?** Check:
- `ADDING_OPTIONS.md` - How to add more options
- `evals/README.md` - EVALS documentation
- `API_README.md` - API documentation
