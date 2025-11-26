// API endpoint to retrieve A/B test analytics
// This uses Vercel KV (Redis) for persistent storage

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      // Get all events (last 1000)
      const eventsJson = await kv.lrange('abtest:events', 0, 999);
      const events = eventsJson.map(e => JSON.parse(e));

      // Get variant summary
      const variants = await kv.hgetall('abtest:variants') || {};

      // Calculate detailed metrics per variant
      const summary = {};
      const variantKeys = ['Alive', 'Afinal', 'Blive', 'Bfinal'];

      for (const variantKey of variantKeys) {
        const stats = await kv.hgetall(`abtest:${variantKey}`) || {};

        const impressions = parseInt(stats.impression) || 0;
        const clicks = parseInt(stats.click) || 0;
        const purchases = parseInt(stats.purchase) || 0;

        summary[variantKey] = {
          impressions,
          clicks,
          purchases,
          clickRate: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0,
          conversionRate: clicks > 0 ? ((purchases / clicks) * 100).toFixed(2) : 0,
          overallConversionRate: impressions > 0 ? ((purchases / impressions) * 100).toFixed(2) : 0
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
          clickRate: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0,
          conversionRate: totalClicks > 0 ? ((totalPurchases / totalClicks) * 100).toFixed(2) : 0
        },
        events: events.slice(0, 100), // Return last 100 events
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error retrieving analytics:', error);

      // Fallback: Return empty data if KV is not configured
      return res.status(200).json({
        success: true,
        message: 'KV not configured',
        fallback: true,
        totalEvents: 0,
        summary: {
          Alive: { impressions: 0, clicks: 0, purchases: 0, clickRate: 0, conversionRate: 0, overallConversionRate: 0 },
          Afinal: { impressions: 0, clicks: 0, purchases: 0, clickRate: 0, conversionRate: 0, overallConversionRate: 0 },
          Blive: { impressions: 0, clicks: 0, purchases: 0, clickRate: 0, conversionRate: 0, overallConversionRate: 0 },
          Bfinal: { impressions: 0, clicks: 0, purchases: 0, clickRate: 0, conversionRate: 0, overallConversionRate: 0 }
        },
        funnel: { impressions: 0, clicks: 0, purchases: 0, clickRate: 0, conversionRate: 0 },
        events: []
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
