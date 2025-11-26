# A/B Test Analytics Setup Guide

This guide explains how to set up persistent analytics storage for the A/B test experiment.

## Architecture

The analytics system uses:
- **Frontend**: React components track events (impressions, clicks, purchases)
- **API**: Vercel Serverless Functions (`/api/events`, `/api/analytics`)
- **Storage**: Vercel KV (Redis) for persistent data storage
- **Fallback**: localStorage backup if API is unavailable

## Setup Steps

### 1. Install Vercel KV

The `@vercel/kv` package is already in `package.json`.

### 2. Create Vercel KV Database

1. Go to your Vercel dashboard
2. Select your project
3. Navigate to **Storage** tab
4. Click **Create Database**
5. Select **KV** (Redis)
6. Name it `abtest-analytics` (or any name)
7. Select a region close to your users
8. Click **Create**

### 3. Link KV to Your Project

Vercel will automatically add environment variables:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`

These are automatically injected into your serverless functions.

### 4. Deploy to Vercel

```bash
# If you haven't deployed yet
vercel

# For production deployment
vercel --prod
```

After deployment, the API endpoints will be available at:
- `https://your-domain.vercel.app/api/events` (POST)
- `https://your-domain.vercel.app/api/analytics` (GET)

### 5. Verify Setup

1. Visit your deployed site
2. Navigate to the "A/B Test Analytics" page
3. Perform some test actions (view pages, click CTAs, make purchases)
4. Check the Analytics dashboard - you should see data appearing
5. Verify data persists across browser sessions

## API Endpoints

### POST /api/events

Records an A/B test event.

**Request Body:**
```json
{
  "timestamp": "2025-11-26T12:00:00.000Z",
  "sessionId": "session_123abc",
  "eventType": "impression|click|purchase",
  "ctaVariant": "A|B",
  "pricingVariant": "live|final",
  "clickSource": "header|dashboard",
  "purchased": false,
  "programConfig": "...",
  "pricing": 1500
}
```

**Response:**
```json
{
  "success": true,
  "eventId": "event:1234567890:abc123",
  "message": "Event recorded successfully"
}
```

### GET /api/analytics

Retrieves aggregated analytics data.

**Response:**
```json
{
  "success": true,
  "totalEvents": 150,
  "summary": {
    "Alive": {
      "impressions": 40,
      "clicks": 12,
      "purchases": 3,
      "clickRate": "30.00",
      "conversionRate": "25.00",
      "overallConversionRate": "7.50"
    },
    ...
  },
  "funnel": {
    "impressions": 150,
    "clicks": 45,
    "purchases": 12,
    "clickRate": "30.00",
    "conversionRate": "26.67"
  },
  "events": [...],
  "timestamp": "2025-11-26T12:00:00.000Z"
}
```

## Data Storage Structure

### Redis Keys

- `abtest:events` - List of all events (LPUSH)
- `abtest:variants` - Hash of variant counts
- `abtest:Alive` - Hash of event counts for variant Alive
- `abtest:Afinal` - Hash of event counts for variant Afinal
- `abtest:Blive` - Hash of event counts for variant Blive
- `abtest:Bfinal` - Hash of event counts for variant Bfinal

### Event Object

```javascript
{
  timestamp: "2025-11-26T12:00:00.000Z",
  serverTimestamp: "2025-11-26T12:00:00.100Z",
  sessionId: "session_123abc",
  eventType: "purchase",
  ctaVariant: "A",
  pricingVariant: "live",
  clickSource: "header",
  purchased: true,
  programConfig: "{...}",
  pricing: 1500
}
```

## Analytics Dashboard

Access the analytics dashboard at:
- Local: `http://localhost:5173` → Click "A/B Test Analytics" in sidebar
- Production: `https://your-domain.vercel.app` → Click "A/B Test Analytics"

### Features

1. **Overall Conversion Funnel**
   - Visual funnel showing: Impressions → Clicks → Purchases
   - Percentages and counts at each stage
   - Color-coded bars (cyan → purple → green)

2. **Variant Comparison**
   - 2x2 grid showing all 4 variants
   - Metrics per variant:
     - Impressions, Clicks, Purchases (counts)
     - Click Rate, Conversion Rate, Overall CVR (percentages)

3. **Auto-Refresh**
   - Data refreshes every 30 seconds
   - Manual refresh button available

## Fallback Behavior

If Vercel KV is not configured:
- API endpoints return success but don't store data
- Events are still tracked in browser localStorage
- Analytics dashboard shows empty state
- Console logging still works

This allows development without KV setup.

## Troubleshooting

### API Returns "KV not configured"

**Solution**: Ensure Vercel KV is created and linked to your project.

```bash
# Link your project
vercel link

# Pull environment variables
vercel env pull .env.local

# Redeploy
vercel --prod
```

### No Data Appearing

1. Check browser console for errors
2. Verify API endpoints are reachable:
   ```bash
   curl -X POST https://your-domain.vercel.app/api/events \
     -H "Content-Type: application/json" \
     -d '{"eventType":"test"}'
   ```
3. Check Vercel function logs in dashboard
4. Verify KV database is active

### Data Not Persisting

- Check KV database status in Vercel dashboard
- Verify environment variables are set
- Check function logs for errors

## Exporting Data

### CSV Export

Use the browser console:
```javascript
// Download CSV of all events
window.downloadCSV()
```

### Direct Database Access

Use Vercel KV CLI or dashboard to query data:
```bash
# Via CLI
vercel kv get abtest:events
```

## Cost Considerations

**Vercel KV Free Tier:**
- 256 MB storage
- 100K commands/month
- Good for ~10,000-50,000 events

**Pro Plan:**
- 1 GB storage ($5/month)
- 1M commands/month
- Good for production use

## Data Retention

Events are stored indefinitely in Redis. To implement data retention:

1. Add TTL to events (modify `/api/events.js`):
```javascript
await kv.lpush('abtest:events', JSON.stringify(event));
await kv.expire('abtest:events', 60 * 60 * 24 * 30); // 30 days
```

2. Or periodically archive old data to S3/database

## Next Steps

1. **Statistical Analysis**: Export CSV and analyze with tools like:
   - Google Sheets / Excel
   - Python (pandas, scipy.stats)
   - R statistical software

2. **Winner Selection**: Use chi-square test or bayesian analysis to determine statistical significance

3. **Implementation**: Remove losing variants and implement winner

## Support

For issues with Vercel KV:
- Vercel Documentation: https://vercel.com/docs/storage/vercel-kv
- Vercel Support: https://vercel.com/support
