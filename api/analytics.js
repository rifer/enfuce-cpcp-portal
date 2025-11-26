// API endpoint to retrieve A/B test analytics
// This uses Vercel Blob for persistent storage

import { head } from '@vercel/blob';

const BLOB_FILE = 'abtest-events.json';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Check if Blob token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      // Return empty analytics for local development
      return res.status(200).json({
        success: true,
        message: 'Blob storage not configured (expected in local dev)',
        fallback: true,
        note: 'Deploy to Vercel for persistent analytics. Using localStorage for now.',
        totalEvents: 0,
        summary: {
          Alive: { impressions: 0, clicks: 0, purchases: 0, clickRate: '0.00', conversionRate: '0.00', overallConversionRate: '0.00' },
          Afinal: { impressions: 0, clicks: 0, purchases: 0, clickRate: '0.00', conversionRate: '0.00', overallConversionRate: '0.00' },
          Blive: { impressions: 0, clicks: 0, purchases: 0, clickRate: '0.00', conversionRate: '0.00', overallConversionRate: '0.00' },
          Bfinal: { impressions: 0, clicks: 0, purchases: 0, clickRate: '0.00', conversionRate: '0.00', overallConversionRate: '0.00' }
        },
        funnel: { impressions: 0, clicks: 0, purchases: 0, clickRate: '0.00', conversionRate: '0.00' },
        events: []
      });
    }

    try {
      // Read events from Blob
      let events = [];
      try {
        const blob = await head(BLOB_FILE);
        if (blob) {
          const response = await fetch(blob.url);
          events = await response.json();
        }
      } catch (error) {
        // File doesn't exist yet
        events = [];
      }

      // Calculate detailed metrics per variant
      const summary = {};
      const variantKeys = ['Alive', 'Afinal', 'Blive', 'Bfinal'];

      for (const variantKey of variantKeys) {
        const variantEvents = events.filter(e =>
          `${e.ctaVariant}${e.pricingVariant}` === variantKey
        );

        const impressions = variantEvents.filter(e => e.eventType === 'impression').length;
        const clicks = variantEvents.filter(e => e.eventType === 'click').length;
        const purchases = variantEvents.filter(e => e.eventType === 'purchase').length;

        summary[variantKey] = {
          impressions,
          clicks,
          purchases,
          clickRate: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00',
          conversionRate: clicks > 0 ? ((purchases / clicks) * 100).toFixed(2) : '0.00',
          overallConversionRate: impressions > 0 ? ((purchases / impressions) * 100).toFixed(2) : '0.00'
        };
      }

      // Calculate funnel data across all variants
      const totalImpressions = events.filter(e => e.eventType === 'impression').length;
      const totalClicks = events.filter(e => e.eventType === 'click').length;
      const totalPurchases = events.filter(e => e.eventType === 'purchase').length;

      return res.status(200).json({
        success: true,
        totalEvents: events.length,
        summary,
        funnel: {
          impressions: totalImpressions,
          clicks: totalClicks,
          purchases: totalPurchases,
          clickRate: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00',
          conversionRate: totalClicks > 0 ? ((totalPurchases / totalClicks) * 100).toFixed(2) : '0.00'
        },
        events: events.slice(-100), // Return last 100 events
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error retrieving analytics:', error);

      // Fallback: Return empty data if Blob is not configured
      return res.status(200).json({
        success: true,
        message: 'Storage not configured',
        fallback: true,
        totalEvents: 0,
        summary: {
          Alive: { impressions: 0, clicks: 0, purchases: 0, clickRate: '0.00', conversionRate: '0.00', overallConversionRate: '0.00' },
          Afinal: { impressions: 0, clicks: 0, purchases: 0, clickRate: '0.00', conversionRate: '0.00', overallConversionRate: '0.00' },
          Blive: { impressions: 0, clicks: 0, purchases: 0, clickRate: '0.00', conversionRate: '0.00', overallConversionRate: '0.00' },
          Bfinal: { impressions: 0, clicks: 0, purchases: 0, clickRate: '0.00', conversionRate: '0.00', overallConversionRate: '0.00' }
        },
        funnel: { impressions: 0, clicks: 0, purchases: 0, clickRate: '0.00', conversionRate: '0.00' },
        events: []
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
