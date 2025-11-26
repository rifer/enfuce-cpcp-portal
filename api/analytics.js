// API endpoint to retrieve A/B test analytics
// This uses Vercel Blob for persistent storage

import { list } from '@vercel/blob';

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
        // List all blobs with the prefix
        const { blobs } = await list({ prefix: 'abtest-events' });

        if (blobs && blobs.length > 0) {
          // Find the exact file (it might have a suffix)
          const blob = blobs.find(b => b.pathname.startsWith('abtest-events'));

          if (blob && blob.url) {
            console.log('Analytics - Found blob at:', blob.url);
            const response = await fetch(blob.url);

            if (response.ok) {
              const text = await response.text();
              if (text && text.trim()) {
                try {
                  events = JSON.parse(text);
                  console.log(`Analytics - Successfully loaded ${events.length} events`);
                } catch (parseError) {
                  console.error('Analytics - Error parsing events:', parseError);
                  events = [];
                }
              }
            }
          }
        } else {
          console.log('Analytics - No blob found yet');
        }
      } catch (error) {
        console.error('Analytics - Error reading blob:', error);
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

      // Calculate chat wizard analytics
      const chatWizardStarted = events.filter(e => e.event_action === 'chat_wizard_started').length;
      const chatWizardCompleted = events.filter(e => e.event_action === 'chat_wizard_completed').length;
      const chatWizardAbandoned = events.filter(e => e.event_action === 'chat_wizard_abandoned').length;
      const chatWizardStepEvents = events.filter(e => e.event_action === 'chat_wizard_step_completed');

      // Calculate traditional vs chat wizard distribution
      // This would need to track wizard variant assignments - for now using placeholder
      const traditionalCount = events.filter(e => e.wizardVariant === 'traditional').length;
      const chatCount = events.filter(e => e.wizardVariant === 'chat').length;
      const totalWizard = traditionalCount + chatCount;

      const chatWizardAnalytics = {
        traditionalCount,
        chatCount,
        traditionalPercent: totalWizard > 0 ? Math.round((traditionalCount / totalWizard) * 100) : 50,
        chatPercent: totalWizard > 0 ? Math.round((chatCount / totalWizard) * 100) : 50,
        started: chatWizardStarted,
        completed: chatWizardCompleted,
        abandoned: chatWizardAbandoned,
        completionRate: chatWizardStarted > 0 ? ((chatWizardCompleted / chatWizardStarted) * 100).toFixed(1) : '0.0',
        avgMessages: chatWizardCompleted > 0
          ? Math.round(events.filter(e => e.event_action === 'chat_wizard_completed')
              .reduce((sum, e) => sum + (e.messages_count || 0), 0) / chatWizardCompleted)
          : 0,
        avgStepsCompleted: chatWizardStepEvents.length > 0
          ? (chatWizardStepEvents.reduce((sum, e) => sum + (e.step || 0), 0) / chatWizardStepEvents.length).toFixed(1)
          : '0.0',
        commonDropoffStep: chatWizardAbandoned > 0
          ? Math.round(events.filter(e => e.event_action === 'chat_wizard_abandoned')
              .reduce((sum, e) => sum + (e.step || 0), 0) / chatWizardAbandoned)
          : null
      };

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
        chatWizard: chatWizardAnalytics,
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
