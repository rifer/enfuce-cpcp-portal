-- ============================================================================
-- MANUAL CLEANUP SCRIPT
-- ============================================================================
-- Run these commands ONE BY ONE in Supabase SQL Editor if the main migration fails
-- Copy and paste each section, wait for it to complete, then move to the next
-- ============================================================================

-- SECTION 1: Check current state
-- ============================================================================
-- Run this first to see what currently exists
SELECT
    'Tables' as object_type,
    tablename as name
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE '%card_schemes%'
   OR tablename LIKE '%program_types%'
   OR tablename LIKE '%funding_models%'
   OR tablename LIKE '%form_factors%'
   OR tablename LIKE '%currencies%'
   OR tablename LIKE '%configuration_statuses%'

UNION ALL

SELECT
    'Columns' as object_type,
    tablename || '.' || column_name as name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('card_schemes', 'program_types', 'funding_models',
                   'form_factors', 'currencies', 'configuration_statuses');

-- ============================================================================
-- SECTION 2: Disable RLS (run this if you see tables above)
-- ============================================================================
ALTER TABLE IF EXISTS card_schemes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS program_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS funding_models DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS form_factors DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS currencies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS configuration_statuses DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: Drop individual tables (run one at a time)
-- ============================================================================

-- Drop card_schemes
DROP TABLE IF EXISTS card_schemes CASCADE;

-- Drop program_types
DROP TABLE IF EXISTS program_types CASCADE;

-- Drop funding_models
DROP TABLE IF EXISTS funding_models CASCADE;

-- Drop form_factors
DROP TABLE IF EXISTS form_factors CASCADE;

-- Drop currencies
DROP TABLE IF EXISTS currencies CASCADE;

-- Drop configuration_statuses
DROP TABLE IF EXISTS configuration_statuses CASCADE;

-- ============================================================================
-- SECTION 4: Verify cleanup (should return 0 rows)
-- ============================================================================
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('card_schemes', 'program_types', 'funding_models',
                  'form_factors', 'currencies', 'configuration_statuses');

-- ============================================================================
-- SECTION 5: Create tables one by one
-- ============================================================================

-- Create card_schemes
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

-- Create program_types
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

-- Create funding_models
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

-- Create form_factors
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

-- Create currencies
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

-- Create configuration_statuses
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
-- SECTION 6: Verify tables exist with sort_order column
-- ============================================================================
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('card_schemes', 'program_types', 'funding_models',
                   'form_factors', 'currencies', 'configuration_statuses')
AND column_name = 'sort_order'
ORDER BY table_name;

-- Should show 6 rows, one for each table

-- ============================================================================
-- SECTION 7: Insert data (run each INSERT separately)
-- ============================================================================

-- Insert card schemes
INSERT INTO card_schemes (code, display_name, description, sort_order, is_active) VALUES
    ('Visa', 'Visa', 'Visa payment network', 1, true),
    ('Mastercard', 'Mastercard', 'Mastercard payment network', 2, true),
    ('American Express', 'American Express', 'American Express payment network', 3, true),
    ('Discover', 'Discover', 'Discover payment network', 4, true),
    ('UnionPay', 'UnionPay', 'China UnionPay payment network', 5, true),
    ('JCB', 'JCB', 'Japan Credit Bureau payment network', 6, true);

-- Insert program types
INSERT INTO program_types (code, display_name, description, sort_order, is_active) VALUES
    ('corporate', 'Corporate', 'Corporate expense cards', 1, true),
    ('fleet', 'Fleet', 'Fleet management cards', 2, true),
    ('meal', 'Meal', 'Meal voucher cards', 3, true),
    ('travel', 'Travel', 'Travel expense cards', 4, true),
    ('gift', 'Gift', 'Gift cards', 5, true),
    ('transport', 'Transport', 'Public transport cards', 6, true),
    ('healthcare', 'Healthcare', 'Healthcare and medical cards', 7, true),
    ('education', 'Education', 'Education and student cards', 8, true);

-- Insert funding models
INSERT INTO funding_models (code, display_name, description, sort_order, is_active) VALUES
    ('prepaid', 'Prepaid', 'Prepaid cards with pre-loaded funds', 1, true),
    ('debit', 'Debit', 'Debit cards linked to accounts', 2, true),
    ('credit', 'Credit', 'Credit cards with revolving credit', 3, true),
    ('charge', 'Charge', 'Charge cards requiring full payment', 4, true),
    ('hybrid', 'Hybrid', 'Hybrid funding models', 5, true);

-- Insert form factors
INSERT INTO form_factors (code, display_name, description, sort_order, is_active) VALUES
    ('physical', 'Physical', 'Physical plastic/metal cards', 1, true),
    ('virtual', 'Virtual', 'Virtual card numbers', 2, true),
    ('digital_wallet', 'Digital Wallet', 'Mobile wallet integration', 3, true);

-- Insert currencies
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

-- Insert configuration statuses
INSERT INTO configuration_statuses (code, display_name, description, sort_order, is_active) VALUES
    ('draft', 'Draft', 'Configuration is being drafted', 1, true),
    ('submitted', 'Submitted', 'Configuration submitted for review', 2, true),
    ('approved', 'Approved', 'Configuration approved', 3, true),
    ('rejected', 'Rejected', 'Configuration rejected', 4, true),
    ('active', 'Active', 'Configuration is active', 5, true);

-- ============================================================================
-- SECTION 8: Verify data was inserted
-- ============================================================================
SELECT 'card_schemes' as table_name, COUNT(*) as count FROM card_schemes
UNION ALL
SELECT 'program_types', COUNT(*) FROM program_types
UNION ALL
SELECT 'funding_models', COUNT(*) FROM funding_models
UNION ALL
SELECT 'form_factors', COUNT(*) FROM form_factors
UNION ALL
SELECT 'currencies', COUNT(*) FROM currencies
UNION ALL
SELECT 'configuration_statuses', COUNT(*) FROM configuration_statuses;

-- Should show:
-- card_schemes: 6
-- program_types: 8
-- funding_models: 5
-- form_factors: 3
-- currencies: 10
-- configuration_statuses: 5

-- ============================================================================
-- SECTION 9: Verify American Express is there
-- ============================================================================
SELECT code, display_name, is_active, sort_order
FROM card_schemes
ORDER BY sort_order;

-- Should show American Express at sort_order 3

-- ============================================================================
-- SECTION 10: Create indexes
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

-- ============================================================================
-- SECTION 11: Create trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 12: Create triggers
-- ============================================================================
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

-- ============================================================================
-- SECTION 13: Enable RLS
-- ============================================================================
ALTER TABLE card_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_statuses ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 14: Create RLS policies
-- ============================================================================
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

-- ============================================================================
-- DONE! Final verification
-- ============================================================================
SELECT 'MIGRATION COMPLETE!' as status;
SELECT 'American Express available: ' || EXISTS(
    SELECT 1 FROM card_schemes WHERE code = 'American Express'
)::TEXT as american_express_check;
