-- ============================================================================
-- COMPLETELY CLEAN MIGRATION - Reset and Create Lookup Tables
-- ============================================================================
-- This migration uses a nuclear approach to ensure a completely clean state
-- It will destroy ALL existing lookup table data and recreate from scratch
-- ============================================================================

-- STEP 1: Nuclear cleanup - Drop everything related to lookup tables
-- ============================================================================

-- First, drop any views that might depend on these tables
DROP VIEW IF EXISTS active_card_schemes CASCADE;
DROP VIEW IF EXISTS active_program_types CASCADE;
DROP VIEW IF EXISTS active_funding_models CASCADE;
DROP VIEW IF EXISTS active_form_factors CASCADE;
DROP VIEW IF EXISTS active_currencies CASCADE;

-- Drop any materialized views
DROP MATERIALIZED VIEW IF EXISTS mv_card_schemes CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_program_types CASCADE;

-- Disable RLS on all tables (ignore errors if tables don't exist)
DO $$
BEGIN
    ALTER TABLE IF EXISTS card_schemes DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS program_types DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS funding_models DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS form_factors DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS currencies DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS configuration_statuses DISABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Drop all functions that might reference these tables
DROP FUNCTION IF EXISTS get_active_card_schemes() CASCADE;
DROP FUNCTION IF EXISTS get_active_program_types() CASCADE;
DROP FUNCTION IF EXISTS validate_card_scheme(text) CASCADE;
DROP FUNCTION IF EXISTS validate_program_type(text) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop all triggers on all tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN (
            'card_schemes', 'program_types', 'funding_models',
            'form_factors', 'currencies', 'configuration_statuses'
        )
    ) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I CASCADE',
                      r.tablename, r.tablename);
    END LOOP;
END $$;

-- Drop all indexes
DROP INDEX IF EXISTS idx_card_schemes_active CASCADE;
DROP INDEX IF EXISTS idx_card_schemes_code CASCADE;
DROP INDEX IF EXISTS idx_program_types_active CASCADE;
DROP INDEX IF EXISTS idx_program_types_code CASCADE;
DROP INDEX IF EXISTS idx_funding_models_active CASCADE;
DROP INDEX IF EXISTS idx_funding_models_code CASCADE;
DROP INDEX IF EXISTS idx_form_factors_active CASCADE;
DROP INDEX IF EXISTS idx_form_factors_code CASCADE;
DROP INDEX IF EXISTS idx_currencies_active CASCADE;
DROP INDEX IF EXISTS idx_currencies_code CASCADE;
DROP INDEX IF EXISTS idx_configuration_statuses_active CASCADE;
DROP INDEX IF EXISTS idx_configuration_statuses_code CASCADE;

-- Drop all policies (brute force approach)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN (
            'card_schemes', 'program_types', 'funding_models',
            'form_factors', 'currencies', 'configuration_statuses'
        )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE',
                      r.policyname, r.schemaname, r.tablename);
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Finally, drop all tables with CASCADE
DROP TABLE IF EXISTS card_schemes CASCADE;
DROP TABLE IF EXISTS program_types CASCADE;
DROP TABLE IF EXISTS funding_models CASCADE;
DROP TABLE IF EXISTS form_factors CASCADE;
DROP TABLE IF EXISTS currencies CASCADE;
DROP TABLE IF EXISTS configuration_statuses CASCADE;

-- Commit cleanup
COMMIT;

-- Small delay to ensure cleanup is complete
SELECT pg_sleep(0.1);

-- ============================================================================
-- STEP 2: Verify cleanup was successful
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
        'card_schemes', 'program_types', 'funding_models',
        'form_factors', 'currencies', 'configuration_statuses'
    );

    IF table_count > 0 THEN
        RAISE EXCEPTION 'Cleanup failed: % lookup tables still exist', table_count;
    END IF;

    RAISE NOTICE '✓ Cleanup verified: All lookup tables successfully removed';
END $$;

-- ============================================================================
-- STEP 3: Create fresh tables with clean schema
-- ============================================================================

-- Card Schemes (Visa, Mastercard, American Express, etc.)
CREATE TABLE card_schemes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Program Types (corporate, fleet, meal, etc.)
CREATE TABLE program_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Funding Models (prepaid, debit, credit, etc.)
CREATE TABLE funding_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Form Factors (physical, virtual, digital wallet)
CREATE TABLE form_factors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Currencies (EUR, USD, GBP, etc.)
CREATE TABLE currencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(3) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10),
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Configuration Statuses (draft, submitted, etc.)
CREATE TABLE configuration_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- STEP 4: Verify tables were created successfully
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
        'card_schemes', 'program_types', 'funding_models',
        'form_factors', 'currencies', 'configuration_statuses'
    );

    IF table_count != 6 THEN
        RAISE EXCEPTION 'Table creation failed: Expected 6 tables, found %', table_count;
    END IF;

    RAISE NOTICE '✓ All 6 lookup tables created successfully';
END $$;

-- ============================================================================
-- STEP 5: Create indexes for performance
-- ============================================================================

CREATE INDEX idx_card_schemes_active ON card_schemes(is_active, sort_order);
CREATE INDEX idx_card_schemes_code ON card_schemes(code);

CREATE INDEX idx_program_types_active ON program_types(is_active, sort_order);
CREATE INDEX idx_program_types_code ON program_types(code);

CREATE INDEX idx_funding_models_active ON funding_models(is_active, sort_order);
CREATE INDEX idx_funding_models_code ON funding_models(code);

CREATE INDEX idx_form_factors_active ON form_factors(is_active, sort_order);
CREATE INDEX idx_form_factors_code ON form_factors(code);

CREATE INDEX idx_currencies_active ON currencies(is_active, sort_order);
CREATE INDEX idx_currencies_code ON currencies(code);

CREATE INDEX idx_configuration_statuses_active ON configuration_statuses(is_active, sort_order);
CREATE INDEX idx_configuration_statuses_code ON configuration_statuses(code);

RAISE NOTICE '✓ All indexes created successfully';

-- ============================================================================
-- STEP 6: Insert reference data
-- ============================================================================

-- Card Schemes
INSERT INTO card_schemes (code, display_name, description, sort_order, is_active) VALUES
    ('Visa', 'Visa', 'Visa payment network', 1, true),
    ('Mastercard', 'Mastercard', 'Mastercard payment network', 2, true),
    ('American Express', 'American Express', 'American Express payment network', 3, true),
    ('Discover', 'Discover', 'Discover payment network', 4, true),
    ('UnionPay', 'UnionPay', 'China UnionPay payment network', 5, true),
    ('JCB', 'JCB', 'Japan Credit Bureau payment network', 6, true);

-- Program Types
INSERT INTO program_types (code, display_name, description, sort_order, is_active) VALUES
    ('corporate', 'Corporate', 'Corporate expense cards', 1, true),
    ('fleet', 'Fleet', 'Fleet management cards', 2, true),
    ('meal', 'Meal', 'Meal voucher cards', 3, true),
    ('travel', 'Travel', 'Travel expense cards', 4, true),
    ('gift', 'Gift', 'Gift cards', 5, true),
    ('transport', 'Transport', 'Public transport cards', 6, true),
    ('healthcare', 'Healthcare', 'Healthcare and medical cards', 7, true),
    ('education', 'Education', 'Education and student cards', 8, true);

-- Funding Models
INSERT INTO funding_models (code, display_name, description, sort_order, is_active) VALUES
    ('prepaid', 'Prepaid', 'Prepaid cards with pre-loaded funds', 1, true),
    ('debit', 'Debit', 'Debit cards linked to accounts', 2, true),
    ('credit', 'Credit', 'Credit cards with revolving credit', 3, true),
    ('charge', 'Charge', 'Charge cards requiring full payment', 4, true),
    ('hybrid', 'Hybrid', 'Hybrid funding models', 5, true);

-- Form Factors
INSERT INTO form_factors (code, display_name, description, sort_order, is_active) VALUES
    ('physical', 'Physical', 'Physical plastic/metal cards', 1, true),
    ('virtual', 'Virtual', 'Virtual card numbers', 2, true),
    ('digital_wallet', 'Digital Wallet', 'Mobile wallet integration', 3, true);

-- Currencies
INSERT INTO currencies (code, display_name, symbol, description, sort_order, is_active) VALUES
    ('EUR', 'Euro', '€', 'European Euro', 1, true),
    ('USD', 'US Dollar', '$', 'United States Dollar', 2, true),
    ('GBP', 'British Pound', '£', 'British Pound Sterling', 3, true),
    ('CHF', 'Swiss Franc', 'Fr', 'Swiss Franc', 4, true),
    ('SEK', 'Swedish Krona', 'kr', 'Swedish Krona', 5, true),
    ('NOK', 'Norwegian Krone', 'kr', 'Norwegian Krone', 6, true),
    ('DKK', 'Danish Krone', 'kr', 'Danish Krone', 7, true),
    ('PLN', 'Polish Zloty', 'zł', 'Polish Zloty', 8, true),
    ('CZK', 'Czech Koruna', 'Kč', 'Czech Koruna', 9, true),
    ('HUF', 'Hungarian Forint', 'Ft', 'Hungarian Forint', 10, true);

-- Configuration Statuses
INSERT INTO configuration_statuses (code, display_name, description, sort_order, is_active) VALUES
    ('draft', 'Draft', 'Configuration is being drafted', 1, true),
    ('submitted', 'Submitted', 'Configuration submitted for review', 2, true),
    ('approved', 'Approved', 'Configuration approved', 3, true),
    ('rejected', 'Rejected', 'Configuration rejected', 4, true),
    ('active', 'Active', 'Configuration is active', 5, true);

-- ============================================================================
-- STEP 7: Verify data insertion
-- ============================================================================

DO $$
DECLARE
    v_card_schemes INTEGER;
    v_program_types INTEGER;
    v_funding_models INTEGER;
    v_form_factors INTEGER;
    v_currencies INTEGER;
    v_statuses INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_card_schemes FROM card_schemes;
    SELECT COUNT(*) INTO v_program_types FROM program_types;
    SELECT COUNT(*) INTO v_funding_models FROM funding_models;
    SELECT COUNT(*) INTO v_form_factors FROM form_factors;
    SELECT COUNT(*) INTO v_currencies FROM currencies;
    SELECT COUNT(*) INTO v_statuses FROM configuration_statuses;

    IF v_card_schemes != 6 THEN
        RAISE EXCEPTION 'Expected 6 card schemes, found %', v_card_schemes;
    END IF;
    IF v_program_types != 8 THEN
        RAISE EXCEPTION 'Expected 8 program types, found %', v_program_types;
    END IF;
    IF v_funding_models != 5 THEN
        RAISE EXCEPTION 'Expected 5 funding models, found %', v_funding_models;
    END IF;
    IF v_form_factors != 3 THEN
        RAISE EXCEPTION 'Expected 3 form factors, found %', v_form_factors;
    END IF;
    IF v_currencies != 10 THEN
        RAISE EXCEPTION 'Expected 10 currencies, found %', v_currencies;
    END IF;
    IF v_statuses != 5 THEN
        RAISE EXCEPTION 'Expected 5 statuses, found %', v_statuses;
    END IF;

    RAISE NOTICE '✓ All reference data inserted successfully';
    RAISE NOTICE '  - Card Schemes: % (including American Express!)', v_card_schemes;
    RAISE NOTICE '  - Program Types: %', v_program_types;
    RAISE NOTICE '  - Funding Models: %', v_funding_models;
    RAISE NOTICE '  - Form Factors: %', v_form_factors;
    RAISE NOTICE '  - Currencies: %', v_currencies;
    RAISE NOTICE '  - Statuses: %', v_statuses;
END $$;

-- ============================================================================
-- STEP 8: Create trigger function for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER update_card_schemes_updated_at
    BEFORE UPDATE ON card_schemes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_program_types_updated_at
    BEFORE UPDATE ON program_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_funding_models_updated_at
    BEFORE UPDATE ON funding_models
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_factors_updated_at
    BEFORE UPDATE ON form_factors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_currencies_updated_at
    BEFORE UPDATE ON currencies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configuration_statuses_updated_at
    BEFORE UPDATE ON configuration_statuses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

RAISE NOTICE '✓ All triggers created successfully';

-- ============================================================================
-- STEP 9: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE card_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_statuses ENABLE ROW LEVEL SECURITY;

-- Create policies (read-only access to active records)
CREATE POLICY "Allow read access to active card schemes"
    ON card_schemes FOR SELECT
    USING (is_active = true);

CREATE POLICY "Allow read access to active program types"
    ON program_types FOR SELECT
    USING (is_active = true);

CREATE POLICY "Allow read access to active funding models"
    ON funding_models FOR SELECT
    USING (is_active = true);

CREATE POLICY "Allow read access to active form factors"
    ON form_factors FOR SELECT
    USING (is_active = true);

CREATE POLICY "Allow read access to active currencies"
    ON currencies FOR SELECT
    USING (is_active = true);

CREATE POLICY "Allow read access to active statuses"
    ON configuration_statuses FOR SELECT
    USING (is_active = true);

RAISE NOTICE '✓ Row Level Security enabled with policies';

-- ============================================================================
-- STEP 10: Final verification and summary
-- ============================================================================

DO $$
DECLARE
    v_card_schemes INTEGER;
    v_program_types INTEGER;
    v_funding_models INTEGER;
    v_form_factors INTEGER;
    v_currencies INTEGER;
    v_statuses INTEGER;
    v_indexes INTEGER;
    v_triggers INTEGER;
    v_policies INTEGER;
BEGIN
    -- Count records
    SELECT COUNT(*) INTO v_card_schemes FROM card_schemes;
    SELECT COUNT(*) INTO v_program_types FROM program_types;
    SELECT COUNT(*) INTO v_funding_models FROM funding_models;
    SELECT COUNT(*) INTO v_form_factors FROM form_factors;
    SELECT COUNT(*) INTO v_currencies FROM currencies;
    SELECT COUNT(*) INTO v_statuses FROM configuration_statuses;

    -- Count indexes
    SELECT COUNT(*) INTO v_indexes
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename IN (
        'card_schemes', 'program_types', 'funding_models',
        'form_factors', 'currencies', 'configuration_statuses'
    );

    -- Count triggers
    SELECT COUNT(*) INTO v_triggers
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    AND c.relname IN (
        'card_schemes', 'program_types', 'funding_models',
        'form_factors', 'currencies', 'configuration_statuses'
    )
    AND NOT t.tgisinternal;

    -- Count policies
    SELECT COUNT(*) INTO v_policies
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN (
        'card_schemes', 'program_types', 'funding_models',
        'form_factors', 'currencies', 'configuration_statuses'
    );

    -- Display summary
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Reference Data:';
    RAISE NOTICE '  ✓ Card Schemes: % (includes American Express!)', v_card_schemes;
    RAISE NOTICE '  ✓ Program Types: %', v_program_types;
    RAISE NOTICE '  ✓ Funding Models: %', v_funding_models;
    RAISE NOTICE '  ✓ Form Factors: %', v_form_factors;
    RAISE NOTICE '  ✓ Currencies: %', v_currencies;
    RAISE NOTICE '  ✓ Configuration Statuses: %', v_statuses;
    RAISE NOTICE '';
    RAISE NOTICE 'Database Objects:';
    RAISE NOTICE '  ✓ Indexes: %', v_indexes;
    RAISE NOTICE '  ✓ Triggers: %', v_triggers;
    RAISE NOTICE '  ✓ RLS Policies: %', v_policies;
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Verify American Express in card_schemes table';
    RAISE NOTICE '2. Test API endpoint: /api/configurations/schema';
    RAISE NOTICE '3. Test wizard to see American Express option';
    RAISE NOTICE '4. Run EVALS: npm run evals';
    RAISE NOTICE '========================================';
END $$;
