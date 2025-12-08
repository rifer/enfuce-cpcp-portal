-- Migration: Add user feedback collection table
-- Created: 2025-12-07
-- Purpose: Store user feedback after card configuration completion

-- Create user_feedback table
CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- User and session information
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    configuration_id UUID,

    -- Ratings (required)
    satisfaction_rating INTEGER NOT NULL CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    ease_of_use_rating INTEGER CHECK (ease_of_use_rating >= 1 AND ease_of_use_rating <= 5),
    would_recommend BOOLEAN,

    -- Qualitative feedback
    most_helpful_feature TEXT,
    issues_encountered JSONB DEFAULT '[]'::jsonb,
    comments TEXT,

    -- Context metadata
    wizard_variant TEXT CHECK (wizard_variant IN ('traditional', 'chat')),
    program_type TEXT,
    funding_model TEXT,
    card_count INTEGER,

    -- A/B test variants
    ab_test_data JSONB DEFAULT '{}'::jsonb,

    -- Analytics
    time_to_complete_seconds INTEGER,

    -- Constraints
    CONSTRAINT valid_session CHECK (session_id IS NOT NULL OR user_id IS NOT NULL)
);

-- Create indexes for common queries
CREATE INDEX idx_user_feedback_created_at ON user_feedback(created_at DESC);
CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_wizard_variant ON user_feedback(wizard_variant);
CREATE INDEX idx_user_feedback_satisfaction ON user_feedback(satisfaction_rating);
CREATE INDEX idx_user_feedback_configuration_id ON user_feedback(configuration_id);

-- Add comments for documentation
COMMENT ON TABLE user_feedback IS 'Stores user feedback collected after card configuration completion';
COMMENT ON COLUMN user_feedback.satisfaction_rating IS 'Overall satisfaction rating from 1-5 stars (required)';
COMMENT ON COLUMN user_feedback.ease_of_use_rating IS 'Ease of use rating from 1-5';
COMMENT ON COLUMN user_feedback.would_recommend IS 'Would user recommend this tool to others';
COMMENT ON COLUMN user_feedback.issues_encountered IS 'Array of issues user encountered during configuration';
COMMENT ON COLUMN user_feedback.wizard_variant IS 'Which wizard was used: traditional or chat';
COMMENT ON COLUMN user_feedback.ab_test_data IS 'JSON object containing A/B test variant information';

-- Enable Row Level Security
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow authenticated users to insert their own feedback
CREATE POLICY "Users can insert their own feedback"
    ON user_feedback
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Allow anonymous users to insert feedback (with session_id only)
CREATE POLICY "Anonymous users can insert feedback"
    ON user_feedback
    FOR INSERT
    TO anon
    WITH CHECK (user_id IS NULL AND session_id IS NOT NULL);

-- Allow admins to view all feedback
CREATE POLICY "Admins can view all feedback"
    ON user_feedback
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Allow users to view their own feedback
CREATE POLICY "Users can view their own feedback"
    ON user_feedback
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
