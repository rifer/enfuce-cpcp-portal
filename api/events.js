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
              console.log(`Fetched blob text length: ${text?.length || 0} chars`);

              if (text && text.trim()) {
                try {
                  const parsed = JSON.parse(text);

                  // Validate that parsed data is an array
                  if (!Array.isArray(parsed)) {
                    console.error('CRITICAL: Parsed data is not an array!', typeof parsed);
                    throw new Error('Blob data is not an array');
                  }

                  events = parsed;
                  existingDataFound = true;
                  console.log(`Successfully loaded ${events.length} existing events`);
                  console.log(`Sample event IDs: ${events.slice(0, 3).map(e => e.eventId).join(', ')}`);
                } catch (parseError) {
                  console.error('CRITICAL ERROR parsing existing events:', parseError);
                  console.error('First 500 chars of blob:', text.substring(0, 500));

                  // REFUSE to continue - this could cause data loss
                  throw new Error(`Failed to parse existing blob data: ${parseError.message}`);
                }
              } else {
                console.log('Blob text is empty - treating as new storage');
              }
            } else {
              console.error(`Fetch response not OK: ${response.status} ${response.statusText}`);
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

      // CRITICAL SAFETY CHECK: Prevent accidental data loss
      // If we found existing data but now only have 1-2 events, something went wrong
      if (existingDataFound && events.length < 3) {
        console.error('CRITICAL ERROR: Existing data found but event array suspiciously small!');
        console.error(`Event count: ${events.length}, existingDataFound: ${existingDataFound}`);
        return res.status(500).json({
          success: false,
          message: 'Safety check failed - refusing to overwrite data with suspiciously small array',
          eventCount: events.length,
          existingDataFound
        });
      }

      // Additional safety: If we're about to save and have very few events, double-check
      if (!existingDataFound && events.length === 1) {
        // This is fine - it's the first event
        console.log('First event ever - initializing blob storage');
      }

      // Keep only last 10,000 events to avoid blob getting too large
      if (events.length > 10000) {
        const originalLength = events.length;
        events = events.slice(-10000);
        console.log(`Trimmed events from ${originalLength} to ${events.length}`);
      }

      // Validate data before writing
      if (!Array.isArray(events)) {
        console.error('CRITICAL: Attempting to save non-array data!');
        return res.status(500).json({
          success: false,
          message: 'Invalid data structure - refusing to save'
        });
      }

      console.log('===== WRITING TO BLOB =====');
      console.log(`About to write ${events.length} events`);
      console.log(`Existing data was found: ${existingDataFound}`);
      console.log(`New event: ${event.eventType} / ${event.event_action || 'N/A'}`);
      console.log(`Last 3 event IDs: ${events.slice(-3).map(e => e.eventId).join(', ')}`);

      // Prepare JSON and validate it can be stringified
      let jsonData;
      try {
        jsonData = JSON.stringify(events);
        console.log(`JSON size: ${jsonData.length} characters`);
      } catch (stringifyError) {
        console.error('CRITICAL: Cannot stringify events array!', stringifyError);
        return res.status(500).json({
          success: false,
          message: 'Failed to serialize events data'
        });
      }

      // Save back to Blob
      const blob = await put(BLOB_FILE, jsonData, {
        access: 'public', // Keep public for easy analytics access (no PII stored)
        addRandomSuffix: false,
        contentType: 'application/json'
      });

      console.log('✅ Successfully saved blob at:', blob.url);
      console.log('===== WRITE COMPLETE =====');

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
