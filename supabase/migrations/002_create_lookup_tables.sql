-- Migration: Create lookup tables for dynamic configuration options
-- Version: 1.0.0
-- Date: 2024-11-27
-- Description: Replace hardcoded enum values with database-driven lookup tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS card_schemes CASCADE;
DROP TABLE IF EXISTS program_types CASCADE;
DROP TABLE IF EXISTS funding_models CASCADE;
DROP TABLE IF EXISTS form_factors CASCADE;
DROP TABLE IF EXISTS currencies CASCADE;
DROP TABLE IF EXISTS configuration_statuses CASCADE;

-- ============================================================
-- CARD SCHEMES
-- ============================================================
CREATE TABLE card_schemes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_card_schemes_active ON card_schemes(is_active, sort_order);

-- Insert default card schemes
INSERT INTO card_schemes (code, display_name, description, sort_order) VALUES
  ('Visa', 'Visa', 'Visa payment network', 1),
  ('Mastercard', 'Mastercard', 'Mastercard payment network', 2),
  ('American Express', 'American Express', 'American Express payment network', 3),
  ('Discover', 'Discover', 'Discover payment network', 4),
  ('UnionPay', 'UnionPay', 'China UnionPay payment network', 5),
  ('JCB', 'JCB', 'Japan Credit Bureau payment network', 6)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- PROGRAM TYPES
-- ============================================================
CREATE TABLE program_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_program_types_active ON program_types(is_active, sort_order);

INSERT INTO program_types (code, display_name, description, sort_order) VALUES
  ('corporate', 'Corporate', 'Corporate expense cards for employees', 1),
  ('fleet', 'Fleet / Fuel', 'Fleet and fuel cards for vehicle management', 2),
  ('meal', 'Meal Card', 'Meal and food benefit cards', 3),
  ('travel', 'Travel', 'Travel and entertainment cards', 4),
  ('gift', 'Gift Card', 'Prepaid gift cards', 5),
  ('transport', 'Transport', 'Public transport and mobility cards', 6),
  ('healthcare', 'Healthcare', 'Healthcare and medical expense cards', 7),
  ('education', 'Education', 'Educational expense cards', 8)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- FUNDING MODELS
-- ============================================================
CREATE TABLE funding_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_funding_models_active ON funding_models(is_active, sort_order);

INSERT INTO funding_models (code, display_name, description, sort_order) VALUES
  ('prepaid', 'Prepaid', 'Prepaid cards with preloaded funds', 1),
  ('debit', 'Debit', 'Debit cards linked to bank account', 2),
  ('credit', 'Credit', 'Credit cards with credit line', 3),
  ('revolving', 'Revolving Credit', 'Revolving credit facility', 4),
  ('charge', 'Charge Card', 'Charge card requiring full monthly payment', 5)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- FORM FACTORS
-- ============================================================
CREATE TABLE form_factors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_form_factors_active ON form_factors(is_active, sort_order);

INSERT INTO form_factors (code, display_name, description, sort_order) VALUES
  ('physical', 'Physical Card', 'Traditional plastic or metal card', 1),
  ('virtual', 'Virtual Card', 'Digital card number for online use', 2),
  ('tokenized', 'Tokenized / Digital Wallet', 'Mobile wallet (Apple Pay, Google Pay, etc.)', 3)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- CURRENCIES
-- ============================================================
CREATE TABLE currencies (
  code CHAR(3) PRIMARY KEY,
  display_name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_currencies_active ON currencies(is_active, sort_order);

INSERT INTO currencies (code, display_name, symbol, description, sort_order) VALUES
  ('EUR', 'Euro', '€', 'European Union currency', 1),
  ('USD', 'US Dollar', '$', 'United States currency', 2),
  ('GBP', 'British Pound', '£', 'United Kingdom currency', 3),
  ('SEK', 'Swedish Krona', 'kr', 'Swedish currency', 4),
  ('NOK', 'Norwegian Krone', 'kr', 'Norwegian currency', 5),
  ('DKK', 'Danish Krone', 'kr', 'Danish currency', 6),
  ('CHF', 'Swiss Franc', 'CHF', 'Swiss currency', 7),
  ('PLN', 'Polish Złoty', 'zł', 'Polish currency', 8),
  ('CZK', 'Czech Koruna', 'Kč', 'Czech currency', 9),
  ('HUF', 'Hungarian Forint', 'Ft', 'Hungarian currency', 10)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- STATUSES
-- ============================================================
CREATE TABLE configuration_statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_configuration_statuses_active ON configuration_statuses(is_active, sort_order);

INSERT INTO configuration_statuses (code, display_name, description, sort_order) VALUES
  ('draft', 'Draft', 'Configuration is being created', 1),
  ('pending_approval', 'Pending Approval', 'Waiting for approval', 2),
  ('active', 'Active', 'Configuration is live and active', 3),
  ('suspended', 'Suspended', 'Temporarily suspended', 4),
  ('archived', 'Archived', 'Archived for historical reference', 5)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- UPDATE TRIGGERS
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all lookup tables
DROP TRIGGER IF EXISTS update_card_schemes_updated_at ON card_schemes;
CREATE TRIGGER update_card_schemes_updated_at
  BEFORE UPDATE ON card_schemes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_program_types_updated_at ON program_types;
CREATE TRIGGER update_program_types_updated_at
  BEFORE UPDATE ON program_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_funding_models_updated_at ON funding_models;
CREATE TRIGGER update_funding_models_updated_at
  BEFORE UPDATE ON funding_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_form_factors_updated_at ON form_factors;
CREATE TRIGGER update_form_factors_updated_at
  BEFORE UPDATE ON form_factors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_currencies_updated_at ON currencies;
CREATE TRIGGER update_currencies_updated_at
  BEFORE UPDATE ON currencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_configuration_statuses_updated_at ON configuration_statuses;
CREATE TRIGGER update_configuration_statuses_updated_at
  BEFORE UPDATE ON configuration_statuses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY (Optional - for future admin UI)
-- ============================================================

-- Enable RLS on lookup tables
ALTER TABLE card_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_statuses ENABLE ROW LEVEL SECURITY;

-- Allow read access to all active rows (public)
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

-- ============================================================
-- VERIFICATION (Optional - comment out if causing issues)
-- ============================================================

-- Verify tables were created successfully
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Card Schemes: %', (SELECT COUNT(*) FROM card_schemes);
  RAISE NOTICE 'Program Types: %', (SELECT COUNT(*) FROM program_types);
  RAISE NOTICE 'Funding Models: %', (SELECT COUNT(*) FROM funding_models);
  RAISE NOTICE 'Form Factors: %', (SELECT COUNT(*) FROM form_factors);
  RAISE NOTICE 'Currencies: %', (SELECT COUNT(*) FROM currencies);
  RAISE NOTICE 'Statuses: %', (SELECT COUNT(*) FROM configuration_statuses);
END $$;
