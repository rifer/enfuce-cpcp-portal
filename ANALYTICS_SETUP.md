# A/B Test Analytics Setup Guide

This guide explains how to set up persistent analytics storage for the A/B test experiment.

## Architecture

The analytics system uses:
- **Frontend**: React components track events (impressions, clicks, purchases)
- **API**: Vercel Serverless Functions (`/api/events`, `/api/analytics`)
- **Storage**: Vercel Blob (simple file storage) for persistent data
- **Fallback**: localStorage backup if API is unavailable

## Setup Steps

### 1. Install Vercel Blob

The `@vercel/blob` package is already in `package.json`.

### 2. Enable Vercel Blob (FREE)

**No setup needed!** Vercel Blob is automatically available for all projects.

**Free Tier Includes:**
- 100 GB bandwidth/month
- Unlimited storage (up to account limits)
- No database setup required

### 3. Deploy to Vercel

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

### Vercel Blob Storage

- Single JSON file: `abtest-events.json`
- Contains array of all events (up to 10,000 most recent)
- Public access for retrieval
- Automatically managed by Vercel Blob API

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

If Vercel Blob is not configured or encounters errors:
- API endpoints return success but don't store data
- Events are still tracked in browser localStorage
- Analytics dashboard shows empty state with fallback message
- Console logging still works

This allows development without Blob setup and provides graceful degradation.

## Troubleshooting

### API Returns "Storage not configured"

**Solution**: Vercel Blob is automatically available. If you see this error:

1. Ensure your project is deployed to Vercel
2. Check Vercel function logs for specific errors
3. Verify `@vercel/blob` package is installed

```bash
# Redeploy to ensure Blob is available
vercel --prod
```

### No Data Appearing

1. Check browser console for errors
2. Verify API endpoints are reachable:
   ```bash
   curl -X POST https://your-domain.vercel.app/api/events \
     -H "Content-Type: application/json" \
     -d '{"eventType":"test","ctaVariant":"A","pricingVariant":"live"}'
   ```
3. Check Vercel function logs in dashboard
4. Verify Blob storage is enabled (should be automatic)

### Data Not Persisting

- Check Vercel deployment status
- Verify function logs for Blob API errors
- Ensure project is deployed (Blob doesn't work in local dev)

## Exporting Data

### CSV Export

Use the browser console:
```javascript
// Download CSV of all events
window.downloadCSV()
```

### Direct Blob Access

Access the blob file via Vercel dashboard or API:
```bash
# Via Vercel CLI
vercel blob ls

# Or use the Vercel dashboard to view blob storage
```

## Cost Considerations

**Vercel Blob Free Tier:**
- 100 GB bandwidth/month
- Unlimited storage (within account limits)
- No per-request charges
- Good for ~100,000+ events

**Pro Plan:**
- 1 TB bandwidth/month
- Unlimited storage
- Ideal for high-traffic production use

## Data Retention

Events are stored indefinitely in Vercel Blob. Current implementation:

1. Automatic retention limit: Last 10,000 events (configured in `/api/events.js`)
```javascript
// Keep only last 10,000 events to avoid blob getting too large
if (events.length > 10000) {
  events = events.slice(-10000);
}
```

2. To implement time-based retention, filter by timestamp before saving
3. Or periodically archive old data to external storage (S3, database)

## Next Steps

1. **Statistical Analysis**: Export CSV and analyze with tools like:
   - Google Sheets / Excel
   - Python (pandas, scipy.stats)
   - R statistical software

2. **Winner Selection**: Use chi-square test or bayesian analysis to determine statistical significance

3. **Implementation**: Remove losing variants and implement winner

## Support

For issues with Vercel Blob:
- Vercel Documentation: https://vercel.com/docs/storage/vercel-blob
- Vercel Support: https://vercel.com/support
