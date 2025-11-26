// API endpoint to record A/B test events
// This uses Vercel Blob for persistent storage (free tier available)

import { put, head } from '@vercel/blob';

const BLOB_FILE = 'abtest-events.json';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    // Check if Blob token is configured
    // Try multiple possible token names
    const token = process.env.BLOB_READ_WRITE_TOKEN ||
                  process.env.ABTEST_ANALYTICS_READ_WRITE_TOKEN ||
                  process.env.KV_REST_API_TOKEN;

    if (!token) {
      // Gracefully handle missing token (local development)
      console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('BLOB') || k.includes('TOKEN')));
      return res.status(200).json({
        success: true,
        message: 'Event received (Blob storage not configured - expected in local dev)',
        fallback: true,
        note: 'Events are being tracked in browser localStorage. Deploy to Vercel for persistent storage.'
      });
    }

    try {
      const event = req.body;

      // Add server timestamp
      event.serverTimestamp = new Date().toISOString();

      // Generate unique event ID
      const eventId = `event:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
      event.eventId = eventId;

      // Read existing events from Blob
      let events = [];
      try {
        const existingBlob = await head(BLOB_FILE);
        if (existingBlob) {
          const response = await fetch(existingBlob.url);
          events = await response.json();
        }
      } catch (error) {
        // File doesn't exist yet, start with empty array
        events = [];
      }

      // Add new event
      events.push(event);

      // Keep only last 10,000 events to avoid blob getting too large
      if (events.length > 10000) {
        events = events.slice(-10000);
      }

      // Save back to Blob
      await put(BLOB_FILE, JSON.stringify(events), {
        access: 'public',
        addRandomSuffix: false
      });

      return res.status(200).json({
        success: true,
        eventId,
        message: 'Event recorded successfully',
        totalEvents: events.length
      });
    } catch (error) {
      console.error('Error storing event:', error);

      // Return success even if storage fails (graceful degradation)
      return res.status(200).json({
        success: true,
        message: 'Event received (storage not configured)',
        fallback: true,
        error: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
