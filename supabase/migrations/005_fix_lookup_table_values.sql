-- Migration: Fix lookup table values for funding models and form factors
-- Created: 2025-12-07
-- Purpose: Remove invalid funding models (charge, hybrid) and fix form factor (digital_wallet -> tokenized)

-- Fix funding_models table
-- Remove 'charge' and 'hybrid' as they are not valid funding models
-- Valid models are: prepaid, debit, credit, revolving

DELETE FROM funding_models WHERE code IN ('charge', 'hybrid');

-- Add 'revolving' if it doesn't exist
INSERT INTO funding_models (code, display_name, description, sort_order, is_active)
VALUES ('revolving', 'Revolving', 'Revolving credit facility', 4, true)
ON CONFLICT (code) DO UPDATE
SET display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    is_active = true;

-- Fix form_factors table
-- Replace 'digital_wallet' with 'tokenized'

UPDATE form_factors
SET code = 'tokenized',
    display_name = 'Tokenized',
    description = 'Tokenized cards for mobile wallets (Apple Pay, Google Pay, etc.)'
WHERE code = 'digital_wallet';

-- If the update didn't work (record doesn't exist), insert it
INSERT INTO form_factors (code, display_name, description, sort_order, is_active)
VALUES ('tokenized', 'Tokenized', 'Tokenized cards for mobile wallets (Apple Pay, Google Pay, etc.)', 3, true)
ON CONFLICT (code) DO NOTHING;

-- Delete digital_wallet if it still exists (in case update created a new row)
DELETE FROM form_factors WHERE code = 'digital_wallet';

-- Verify the changes
DO $$
DECLARE
    v_funding_models TEXT[];
    v_form_factors TEXT[];
BEGIN
    -- Get all funding model codes
    SELECT ARRAY_AGG(code ORDER BY sort_order) INTO v_funding_models
    FROM funding_models
    WHERE is_active = true;

    -- Get all form factor codes
    SELECT ARRAY_AGG(code ORDER BY sort_order) INTO v_form_factors
    FROM form_factors
    WHERE is_active = true;

    -- Verify funding models
    IF 'charge' = ANY(v_funding_models) OR 'hybrid' = ANY(v_funding_models) THEN
        RAISE EXCEPTION 'Invalid funding models still exist: %', v_funding_models;
    END IF;

    IF NOT ('prepaid' = ANY(v_funding_models) AND 'debit' = ANY(v_funding_models)
            AND 'credit' = ANY(v_funding_models) AND 'revolving' = ANY(v_funding_models)) THEN
        RAISE EXCEPTION 'Missing required funding models. Current: %', v_funding_models;
    END IF;

    -- Verify form factors
    IF 'digital_wallet' = ANY(v_form_factors) THEN
        RAISE EXCEPTION 'Invalid form factor digital_wallet still exists: %', v_form_factors;
    END IF;

    IF NOT ('tokenized' = ANY(v_form_factors)) THEN
        RAISE EXCEPTION 'Missing required form factor tokenized. Current: %', v_form_factors;
    END IF;

    RAISE NOTICE '✓ Lookup tables fixed successfully';
    RAISE NOTICE '  - Funding models: %', v_funding_models;
    RAISE NOTICE '  - Form factors: %', v_form_factors;
END $$;
