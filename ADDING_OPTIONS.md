# Adding New Card Schemes (e.g., American Express)

The wizard now dynamically loads available options from the API. To add American Express or any other card scheme, you have two options:

## Option 1: Quick Update (Schema Endpoint Only)

**Pros:** Fast, no database changes needed
**Cons:** Options hardcoded in code

### Steps:

1. **Update the schema endpoint** (`api/configurations/schema.js`):

```javascript
card_scheme: {
  type: 'enum',
  required: true,
  options: ['Visa', 'Mastercard', 'American Express', 'Discover'], // Add here
  description: 'Card payment network'
}
```

2. **Update validation in API endpoints** (`api/configurations/index.js` and `api/configurations/[id].js`):

```javascript
const validSchemes = ['Visa', 'Mastercard', 'American Express', 'Discover']; // Add here
const normalizedScheme = configData.card_scheme?.charAt(0).toUpperCase() + configData.card_scheme?.slice(1).toLowerCase();
```

3. **Deploy** - Changes take effect immediately

✅ **Wizard will now show American Express as an option!**

---

## Option 2: Database-Driven (Recommended for Production)

**Pros:** Fully dynamic, no code changes needed to add/remove options
**Cons:** Requires database schema changes

### Architecture:

Create lookup tables for all enums → API queries database → Wizard displays options

### Implementation:

#### 1. **Create Lookup Tables in Supabase**

Run this SQL in Supabase SQL Editor:

```sql
-- Card Schemes Table
CREATE TABLE IF NOT EXISTS card_schemes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default schemes
INSERT INTO card_schemes (code, display_name) VALUES
  ('Visa', 'Visa'),
  ('Mastercard', 'Mastercard'),
  ('American Express', 'American Express'),
  ('Discover', 'Discover'),
  ('UnionPay', 'UnionPay')
ON CONFLICT (code) DO NOTHING;

-- Program Types Table
CREATE TABLE IF NOT EXISTS program_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO program_types (code, display_name) VALUES
  ('corporate', 'Corporate'),
  ('fleet', 'Fleet / Fuel'),
  ('meal', 'Meal Card'),
  ('travel', 'Travel'),
  ('gift', 'Gift Card'),
  ('transport', 'Transport')
ON CONFLICT (code) DO NOTHING;

-- Funding Models Table
CREATE TABLE IF NOT EXISTS funding_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO funding_models (code, display_name) VALUES
  ('prepaid', 'Prepaid'),
  ('debit', 'Debit'),
  ('credit', 'Credit'),
  ('revolving', 'Revolving')
ON CONFLICT (code) DO NOTHING;

-- Form Factors Table
CREATE TABLE IF NOT EXISTS form_factors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO form_factors (code, display_name) VALUES
  ('physical', 'Physical Card'),
  ('virtual', 'Virtual Card'),
  ('tokenized', 'Tokenized / Digital Wallet')
ON CONFLICT (code) DO NOTHING;

-- Currencies Table
CREATE TABLE IF NOT EXISTS currencies (
  code CHAR(3) PRIMARY KEY,
  display_name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO currencies (code, display_name, symbol) VALUES
  ('EUR', 'Euro', '€'),
  ('USD', 'US Dollar', '$'),
  ('GBP', 'British Pound', '£'),
  ('SEK', 'Swedish Krona', 'kr'),
  ('NOK', 'Norwegian Krone', 'kr'),
  ('DKK', 'Danish Krone', 'kr'),
  ('CHF', 'Swiss Franc', 'CHF')
ON CONFLICT (code) DO NOTHING;
```

#### 2. **Update Schema Endpoint to Query Database**

Update `api/configurations/schema.js`:

```javascript
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient.js';

export default async function handler(req, res) {
  // ... CORS headers ...

  try {
    // Fetch options from database
    const [
      { data: cardSchemes },
      { data: programTypes },
      { data: fundingModels },
      { data: formFactors },
      { data: currencies }
    ] = await Promise.all([
      supabase.from('card_schemes').select('code, display_name').eq('is_active', true),
      supabase.from('program_types').select('code, display_name').eq('is_active', true),
      supabase.from('funding_models').select('code, display_name').eq('is_active', true),
      supabase.from('form_factors').select('code, display_name').eq('is_active', true),
      supabase.from('currencies').select('code, display_name, symbol').eq('is_active', true)
    ]);

    const schema = {
      program_name: {
        type: 'string',
        required: true,
        minLength: 3,
        maxLength: 255,
        description: 'Name of the card program'
      },
      program_type: {
        type: 'enum',
        required: true,
        options: programTypes?.map(t => t.code) || ['corporate', 'fleet', 'meal', 'travel', 'gift', 'transport'],
        optionsWithLabels: programTypes || [],
        description: 'Type of card program'
      },
      funding_model: {
        type: 'enum',
        required: true,
        options: fundingModels?.map(f => f.code) || ['prepaid', 'debit', 'credit', 'revolving'],
        optionsWithLabels: fundingModels || [],
        description: 'How the card is funded'
      },
      form_factors: {
        type: 'array',
        required: true,
        items: {
          type: 'enum',
          options: formFactors?.map(f => f.code) || ['physical', 'virtual', 'tokenized'],
          optionsWithLabels: formFactors || []
        },
        description: 'Card form factors (can select multiple)'
      },
      card_scheme: {
        type: 'enum',
        required: true,
        options: cardSchemes?.map(s => s.code) || ['Visa', 'Mastercard'],
        optionsWithLabels: cardSchemes || [],
        description: 'Card payment network'
      },
      currency: {
        type: 'enum',
        required: true,
        default: 'EUR',
        options: currencies?.map(c => c.code) || ['EUR', 'USD', 'GBP', 'SEK'],
        optionsWithLabels: currencies || [],
        description: 'Currency for the card program'
      },
      // ... rest of schema ...
    };

    return res.status(200).json({
      success: true,
      schema,
      version: '1.0.0',
      updated_at: new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Schema endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
```

#### 3. **Add American Express**

Now you can add schemes via Supabase UI or SQL:

```sql
-- Via Supabase Table Editor: Insert new row in card_schemes table
-- OR via SQL:
INSERT INTO card_schemes (code, display_name, is_active)
VALUES ('American Express', 'American Express', true);

-- To disable a scheme without deleting:
UPDATE card_schemes SET is_active = false WHERE code = 'Discover';
```

✅ **American Express now appears in wizard automatically!**

---

## Testing

1. **Check schema endpoint:**
```bash
curl https://your-app.vercel.app/api/configurations/schema
```

Look for `card_scheme.options` - should include your new scheme.

2. **Open wizard** - American Express should appear in dropdown

3. **Create configuration** - Select American Express and save

4. **Verify in Supabase** - Check `card_configurations` table

---

## Benefits of Database-Driven Approach

✅ **No code deployments** to add/remove options
✅ **Admin UI** - Build a settings page to manage options
✅ **Audit trail** - Track when options added/removed
✅ **A/B testing** - Enable options for specific clients
✅ **Localization** - Add `display_name_translations` JSONB field
✅ **Ordering** - Add `sort_order` INTEGER field

---

## Quick Reference: Add New Option

```sql
-- Add new card scheme
INSERT INTO card_schemes (code, display_name)
VALUES ('JCB', 'JCB');

-- Add new program type
INSERT INTO program_types (code, display_name)
VALUES ('healthcare', 'Healthcare');

-- Add new currency
INSERT INTO currencies (code, display_name, symbol)
VALUES ('JPY', 'Japanese Yen', '¥');
```

No code changes needed! ✨
