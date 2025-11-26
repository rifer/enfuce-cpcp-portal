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
    // Log available environment variables for debugging
    console.log('Environment variables check:');
    console.log('- BLOB_READ_WRITE_TOKEN:', process.env.BLOB_READ_WRITE_TOKEN ? 'SET' : 'NOT SET');
    console.log('- All BLOB vars:', Object.keys(process.env).filter(k => k.includes('BLOB')));
    console.log('- All TOKEN vars:', Object.keys(process.env).filter(k => k.includes('TOKEN')));

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
        access: 'public', // Keep public for easy analytics access (no PII stored)
        addRandomSuffix: false,
        contentType: 'application/json'
      });

      return res.status(200).json({
        success: true,
        eventId,
        message: 'Event recorded successfully',
        totalEvents: events.length
      });
    } catch (error) {
      console.error('Error storing event:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      // Check if it's a token error specifically
      if (error.message && error.message.includes('token')) {
        console.error('TOKEN ERROR DETECTED - Blob storage connection may be misconfigured');
      }

      // Return success even if storage fails (graceful degradation)
      return res.status(200).json({
        success: true,
        message: 'Event received (storage error - using localStorage fallback)',
        fallback: true,
        error: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
