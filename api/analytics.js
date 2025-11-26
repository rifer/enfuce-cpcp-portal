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
    // Log available environment variables for debugging
    console.log('Analytics - Environment variables check:');
    console.log('- BLOB_READ_WRITE_TOKEN:', process.env.BLOB_READ_WRITE_TOKEN ? 'SET' : 'NOT SET');
    console.log('- All BLOB vars:', Object.keys(process.env).filter(k => k.includes('BLOB')));
    console.log('- All TOKEN vars:', Object.keys(process.env).filter(k => k.includes('TOKEN')));

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
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      // Check if it's a token error specifically
      if (error.message && error.message.includes('token')) {
        console.error('TOKEN ERROR DETECTED - Blob storage connection may be misconfigured');
      }

      // Fallback: Return empty data if Blob is not configured
      return res.status(200).json({
        success: true,
        message: 'Storage error - using localStorage fallback',
        fallback: true,
        error: error.message,
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
