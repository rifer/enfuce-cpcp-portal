# A/B Test: CTA Placement Experiment

## Overview

This portal implements an A/B test to optimize the placement of the "Create New Card Program" call-to-action (CTA) button.

## Test Setup

### Variants

- **Variant A (Treatment)**: CTA button appears in the header (top-right, always visible)
- **Variant B (Control)**: CTA button appears in the dashboard content area (original position)

### Split
- 50% of users are randomly assigned to each variant
- Assignment is persistent via localStorage (same variant on subsequent visits)

## Implementation Details

### User Assignment
- First-time visitors are randomly assigned to Variant A or B
- Assignment is stored in `localStorage` key: `abtest_cta_variant`
- Once assigned, users always see the same variant

### Tracked Metrics

1. **Impressions**: Number of page loads
2. **Clicks**: Number of times the CTA button is clicked
3. **Conversions**: Number of completed program creations (wizard completions)
4. **Click Rate**: (Clicks / Impressions) × 100
5. **Conversion Rate**: (Conversions / Clicks) × 100

### Data Storage

Analytics data is stored in `localStorage` key: `abtest_analytics`

Example data structure:
```json
{
  "variant": "A",
  "assignedAt": "2025-11-26T10:30:00.000Z",
  "impressions": 25,
  "clicks": 5,
  "conversions": 2,
  "lastImpression": "2025-11-26T14:20:00.000Z",
  "lastClick": "2025-11-26T14:15:00.000Z",
  "clickSource": "header",
  "lastConversion": "2025-11-26T14:18:00.000Z"
}
```

## Viewing Analytics

### Browser Console

Open the browser console and use these helper functions:

```javascript
// View current analytics data with calculated rates
window.getABTestAnalytics()

// Reset the experiment and get reassigned to a new variant
window.resetABTest()
```

### Console Output

When the page loads, you'll see:
```
📊 A/B Test Active - Variant: A
💡 Use window.getABTestAnalytics() to view analytics
💡 Use window.resetABTest() to reset and get reassigned
```

When you click the CTA:
```
A/B Test Click: {
  variant: "A",
  source: "header",
  analytics: { ... }
}
```

When a program is created:
```
A/B Test Conversion: {
  variant: "A",
  analytics: { ... }
}
```

## Collecting Results

### Individual User Data

Each user's data is stored locally in their browser. To collect aggregate data, you would need to:

1. **Option 1: Manual Collection**
   - Ask users to run `window.getABTestAnalytics()` in console
   - Collect and aggregate the results manually

2. **Option 2: Analytics Integration** (Future Enhancement)
   - Send events to Google Analytics, Mixpanel, or similar
   - Example integration points in code:
     - `trackImpression()` - Line 84
     - `trackCTAClick()` - Line 92
     - `trackConversion()` - Line 108

3. **Option 3: Backend API** (Future Enhancement)
   - Send analytics data to your own backend
   - Aggregate results server-side

### Example Backend Integration

You could modify the tracking functions to send data to your backend:

```javascript
const trackCTAClick = async (source) => {
  const analyticsData = JSON.parse(localStorage.getItem('abtest_analytics') || '{}');
  analyticsData.clicks = (analyticsData.clicks || 0) + 1;
  analyticsData.lastClick = new Date().toISOString();
  analyticsData.clickSource = source;
  localStorage.setItem('abtest_analytics', JSON.stringify(analyticsData));

  // Send to backend
  await fetch('/api/analytics/abtest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'click',
      variant: abTestVariant,
      source,
      timestamp: new Date().toISOString()
    })
  });
};
```

## Testing the Experiment

### Test Variant A (Header CTA)
1. Open the app in a new incognito window
2. If you see the CTA in the header (top-right), you have Variant A
3. Open console and verify: `window.getABTestAnalytics()`
4. Click the CTA button
5. Complete the wizard
6. Check analytics again to see updated metrics

### Test Variant B (Dashboard CTA)
1. If you got Variant A, run `window.resetABTest()` and refresh
2. Keep refreshing until you get Variant B (50% chance each time)
3. You should see the CTA in the dashboard content area
4. Repeat the same testing steps as Variant A

### Force a Specific Variant (For Testing)

```javascript
// Force Variant A
localStorage.setItem('abtest_cta_variant', 'A')
location.reload()

// Force Variant B
localStorage.setItem('abtest_cta_variant', 'B')
location.reload()
```

## Success Metrics

To determine the winning variant, compare:

1. **Click-Through Rate (CTR)**
   - Variant with higher CTR = More engaging placement
   - Formula: (Clicks / Impressions) × 100

2. **Conversion Rate**
   - Variant with higher conversion rate = More effective at driving completions
   - Formula: (Conversions / Clicks) × 100

### Statistical Significance

For reliable results, you should:
- Collect data from at least 100+ users per variant
- Run the test for at least 1-2 weeks
- Use a statistical significance calculator to validate results
- Recommended tool: https://abtestguide.com/calc/

## Removing the Test

Once you have a winner, you can:

1. Remove the A/B test logic
2. Keep only the winning variant
3. Remove localStorage keys
4. Update the code to show the CTA in the winning position for all users

## Files Modified

- `src/EnfucePortal.jsx` - Main component with A/B test implementation
  - Lines 22-81: A/B test initialization and tracking
  - Lines 88-91: Handle opening wizard with tracking
  - Lines 847-854: Header CTA (Variant A)
  - Lines 685-693: Dashboard CTA (Variant B)
  - Lines 582-591: Conversion tracking on wizard completion
