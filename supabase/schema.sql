-- Enfuce Card Program Configuration Portal - Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clients/Organizations table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    company_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Card program configurations table
CREATE TABLE IF NOT EXISTS card_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

    -- Basic Information
    program_name VARCHAR(255) NOT NULL,
    program_type VARCHAR(50) NOT NULL CHECK (program_type IN ('corporate', 'fleet', 'meal', 'travel', 'gift', 'transport')),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'active', 'suspended', 'archived')),

    -- Card Configuration
    funding_model VARCHAR(50) NOT NULL CHECK (funding_model IN ('prepaid', 'debit', 'credit', 'revolving')),
    form_factors JSONB DEFAULT '[]'::jsonb, -- ['physical', 'virtual', 'tokenized']
    card_scheme VARCHAR(50) NOT NULL CHECK (card_scheme IN ('Visa', 'Mastercard')),

    -- Financial Settings
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    estimated_cards INTEGER DEFAULT 100,
    daily_limit DECIMAL(10,2) DEFAULT 500.00,
    monthly_limit DECIMAL(10,2) DEFAULT 5000.00,

    -- Card Design
    card_design VARCHAR(50) DEFAULT 'corporate',
    card_color VARCHAR(7) DEFAULT '#2C3E50',
    card_background_image TEXT,

    -- Additional Configuration (extensible)
    additional_config JSONB DEFAULT '{}'::jsonb,
    -- Can store: card_material, aml_provider, fraud_control_provider, etc.

    -- Restrictions
    mcc_restrictions JSONB DEFAULT '[]'::jsonb,
    country_restrictions JSONB DEFAULT '[]'::jsonb,

    -- Pricing (calculated)
    pricing JSONB,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),

    -- Search optimization
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(program_name, '') || ' ' || coalesce(program_type, ''))
    ) STORED
);

-- Configuration templates/presets (optional)
CREATE TABLE IF NOT EXISTS configuration_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_data JSONB NOT NULL,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log for tracking changes
CREATE TABLE IF NOT EXISTS configuration_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    configuration_id UUID REFERENCES card_configurations(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'approved', 'suspended')),
    changed_by VARCHAR(255),
    changes JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_card_configurations_client_id ON card_configurations(client_id);
CREATE INDEX idx_card_configurations_status ON card_configurations(status);
CREATE INDEX idx_card_configurations_program_type ON card_configurations(program_type);
CREATE INDEX idx_card_configurations_created_at ON card_configurations(created_at DESC);
CREATE INDEX idx_card_configurations_search ON card_configurations USING GIN(search_vector);
CREATE INDEX idx_clients_email ON clients(email);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_card_configurations_updated_at BEFORE UPDATE ON card_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data (optional)
INSERT INTO clients (name, email, company_name) VALUES
    ('Demo User', 'demo@enfuce.com', 'Demo Corporation')
ON CONFLICT DO NOTHING;

-- Insert some configuration templates
INSERT INTO configuration_templates (name, description, template_data, is_public) VALUES
    (
        'Corporate Card Standard',
        'Standard corporate card program for business expenses',
        '{
            "program_type": "corporate",
            "funding_model": "prepaid",
            "form_factors": ["physical", "virtual"],
            "card_scheme": "Visa",
            "currency": "EUR",
            "daily_limit": 500,
            "monthly_limit": 5000,
            "card_design": "corporate"
        }'::jsonb,
        true
    ),
    (
        'Fleet Card Program',
        'Fleet card program for fuel and vehicle expenses',
        '{
            "program_type": "fleet",
            "funding_model": "prepaid",
            "form_factors": ["physical"],
            "card_scheme": "Mastercard",
            "currency": "EUR",
            "daily_limit": 200,
            "monthly_limit": 3000,
            "card_design": "corporate",
            "mcc_restrictions": ["5541", "5542"]
        }'::jsonb,
        true
    )
ON CONFLICT DO NOTHING;

-- Row Level Security (RLS) Policies
-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuration_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies (adjust based on your auth strategy)
-- For now, allow all authenticated users to read/write
CREATE POLICY "Enable read access for authenticated users" ON clients
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON card_configurations
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for audit log" ON configuration_audit_log
    FOR SELECT USING (auth.role() = 'authenticated');

-- Comments for documentation
COMMENT ON TABLE clients IS 'Organizations/clients using the card program portal';
COMMENT ON TABLE card_configurations IS 'Card program configurations created through the wizard';
COMMENT ON TABLE configuration_templates IS 'Reusable configuration templates/presets';
COMMENT ON TABLE configuration_audit_log IS 'Audit trail of all configuration changes';

COMMENT ON COLUMN card_configurations.additional_config IS 'Extensible JSON field for storing additional configuration like card_material, aml_provider, fraud_control_provider, etc.';
COMMENT ON COLUMN card_configurations.status IS 'Lifecycle status: draft → pending_approval → active → suspended/archived';
