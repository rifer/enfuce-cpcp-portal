// API endpoint to record A/B test events
// This uses Vercel KV (Redis) for persistent storage
// To enable: Run `vercel link` and `vercel env pull` to set up KV

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const event = req.body;

      // Add server timestamp
      event.serverTimestamp = new Date().toISOString();

      // Generate unique event ID
      const eventId = `event:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;

      // Store event in KV
      await kv.lpush('abtest:events', JSON.stringify(event));

      // Also store in a hash for quick variant lookup
      const variantKey = `${event.ctaVariant}${event.pricingVariant}`;
      await kv.hincrby('abtest:variants', variantKey, 1);

      // Track by event type
      await kv.hincrby(`abtest:${variantKey}`, event.eventType, 1);

      return res.status(200).json({
        success: true,
        eventId,
        message: 'Event recorded successfully'
      });
    } catch (error) {
      console.error('Error storing event:', error);

      // Fallback: If KV is not set up, return success anyway
      // This allows the app to work without KV configured
      return res.status(200).json({
        success: true,
        message: 'Event received (KV not configured)',
        fallback: true
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
