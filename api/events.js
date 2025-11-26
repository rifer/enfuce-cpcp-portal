// API endpoint to record A/B test events
// This uses Vercel Blob for persistent storage (free tier available)

import { put, head, list } from '@vercel/blob';

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
      let existingDataFound = false;

      try {
        // First, try to list all blobs to find our file
        const { blobs } = await list({ prefix: 'abtest-events' });

        if (blobs && blobs.length > 0) {
          // Find the exact file (it might have a suffix)
          const blob = blobs.find(b => b.pathname.startsWith('abtest-events'));

          if (blob && blob.url) {
            console.log('Found existing blob at:', blob.url);
            const response = await fetch(blob.url);

            if (response.ok) {
              const text = await response.text();
              if (text && text.trim()) {
                try {
                  events = JSON.parse(text);
                  existingDataFound = true;
                  console.log(`Successfully loaded ${events.length} existing events`);
                } catch (parseError) {
                  console.error('Error parsing existing events:', parseError);
                  // If we can't parse, keep the empty array but log the error
                  events = [];
                }
              }
            }
          }
        } else {
          console.log('No existing blob found, starting fresh');
        }
      } catch (error) {
        console.error('Error reading existing blob:', error);
        // If there's an error reading, we should NOT overwrite
        // Return error to prevent data loss
        return res.status(500).json({
          success: false,
          message: 'Error reading existing data - event not saved to prevent data loss',
          error: error.message
        });
      }

      // Add new event
      events.push(event);
      console.log(`Total events after adding new one: ${events.length}`);

      // Keep only last 10,000 events to avoid blob getting too large
      if (events.length > 10000) {
        const originalLength = events.length;
        events = events.slice(-10000);
        console.log(`Trimmed events from ${originalLength} to ${events.length}`);
      }

      // Save back to Blob
      const blob = await put(BLOB_FILE, JSON.stringify(events), {
        access: 'public', // Keep public for easy analytics access (no PII stored)
        addRandomSuffix: false,
        contentType: 'application/json'
      });

      console.log('Successfully saved blob at:', blob.url);

      return res.status(200).json({
        success: true,
        eventId,
        message: 'Event recorded successfully',
        totalEvents: events.length,
        blobUrl: blob.url,
        existingDataFound
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
