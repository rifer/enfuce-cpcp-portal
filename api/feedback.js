// API endpoint to save user feedback after card configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate environment variables
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Feedback API - Missing Supabase configuration');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Extract feedback data from request body
    const {
      satisfactionRating,
      easeOfUseRating,
      wouldRecommend,
      mostHelpfulFeature,
      issuesEncountered,
      comments,
      wizardVariant,
      programType,
      fundingModel,
      cardCount,
      configurationId,
      sessionId,
      abTestData,
      timeToCompleteSeconds
    } = req.body;

    // Validate required fields
    if (!satisfactionRating || satisfactionRating < 1 || satisfactionRating > 5) {
      return res.status(400).json({
        error: 'Invalid satisfaction rating. Must be between 1 and 5.'
      });
    }

    if (easeOfUseRating && (easeOfUseRating < 1 || easeOfUseRating > 5)) {
      return res.status(400).json({
        error: 'Invalid ease of use rating. Must be between 1 and 5.'
      });
    }

    // Get user ID from authorization header if present
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

    // Ensure either userId or sessionId is provided
    const finalSessionId = sessionId || `anon_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Prepare feedback data for insertion
    const feedbackData = {
      user_id: userId,
      session_id: finalSessionId,
      configuration_id: configurationId || null,
      satisfaction_rating: parseInt(satisfactionRating),
      ease_of_use_rating: easeOfUseRating ? parseInt(easeOfUseRating) : null,
      would_recommend: wouldRecommend !== null ? Boolean(wouldRecommend) : null,
      most_helpful_feature: mostHelpfulFeature || null,
      issues_encountered: Array.isArray(issuesEncountered) ? issuesEncountered : [],
      comments: comments || null,
      wizard_variant: wizardVariant || null,
      program_type: programType || null,
      funding_model: fundingModel || null,
      card_count: cardCount ? parseInt(cardCount) : null,
      ab_test_data: abTestData || {},
      time_to_complete_seconds: timeToCompleteSeconds ? parseInt(timeToCompleteSeconds) : null
    };

    console.log('Feedback API - Attempting to save feedback:', {
      userId,
      sessionId: finalSessionId,
      satisfactionRating,
      wizardVariant
    });

    // Insert feedback into database
    const { data, error } = await supabase
      .from('user_feedback')
      .insert([feedbackData])
      .select();

    if (error) {
      console.error('Feedback API - Database error:', error);
      return res.status(500).json({
        error: 'Failed to save feedback',
        details: error.message
      });
    }

    console.log('Feedback API - Successfully saved feedback:', data[0]?.id);

    return res.status(200).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedbackId: data[0]?.id
    });

  } catch (error) {
    console.error('Feedback API - Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
