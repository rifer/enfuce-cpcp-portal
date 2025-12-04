/**
 * GET /api/configurations/schema
 * Returns the schema/possible configurations for card programs
 * This helps clients understand what fields are available and their constraints
 */

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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
        options: ['corporate', 'fleet', 'meal', 'travel', 'gift', 'transport'],
        description: 'Type of card program'
      },
      status: {
        type: 'enum',
        required: false,
        default: 'draft',
        options: ['draft', 'pending_approval', 'active', 'suspended', 'archived'],
        description: 'Current status of the program'
      },
      funding_model: {
        type: 'enum',
        required: true,
        options: ['prepaid', 'debit', 'credit', 'revolving'],
        description: 'How the card is funded'
      },
      form_factors: {
        type: 'array',
        required: true,
        items: {
          type: 'enum',
          options: ['physical', 'virtual', 'tokenized']
        },
        description: 'Card form factors (can select multiple)'
      },
      card_scheme: {
        type: 'enum',
        required: true,
        options: ['Visa', 'Mastercard'],
        description: 'Card payment network'
      },
      currency: {
        type: 'enum',
        required: true,
        default: 'EUR',
        options: ['EUR', 'USD', 'GBP', 'SEK'],
        description: 'Currency for the card program'
      },
      estimated_cards: {
        type: 'integer',
        required: true,
        minimum: 1,
        maximum: 1000000,
        default: 100,
        description: 'Estimated number of cards needed'
      },
      daily_limit: {
        type: 'number',
        required: true,
        minimum: 0,
        default: 500,
        description: 'Daily spending limit per card'
      },
      monthly_limit: {
        type: 'number',
        required: true,
        minimum: 0,
        default: 5000,
        description: 'Monthly spending limit per card'
      },
      card_design: {
        type: 'enum',
        required: false,
        default: 'corporate',
        options: ['corporate', 'premium', 'ocean', 'sunset', 'custom'],
        description: 'Visual design of the card'
      },
      card_color: {
        type: 'string',
        required: false,
        pattern: '^#[0-9A-Fa-f]{6}$',
        default: '#2C3E50',
        description: 'Custom card color (hex format)'
      },
      card_background_image: {
        type: 'string',
        required: false,
        format: 'uri',
        description: 'URL to custom background image'
      },
      mcc_restrictions: {
        type: 'array',
        required: false,
        items: {
          type: 'string',
          pattern: '^[0-9]{4}$'
        },
        description: 'Merchant Category Code restrictions (4-digit codes)'
      },
      country_restrictions: {
        type: 'array',
        required: false,
        items: {
          type: 'string',
          pattern: '^[A-Z]{2}$'
        },
        description: 'Country restrictions (ISO 3166-1 alpha-2 codes)'
      },
      additional_config: {
        type: 'object',
        required: false,
        properties: {
          card_material: {
            type: 'enum',
            options: ['plastic', 'metal', 'recycled', 'biodegradable'],
            description: 'Physical card material'
          },
          aml_provider: {
            type: 'enum',
            options: ['enfuce_standard', 'external_provider_a', 'external_provider_b'],
            description: 'AML (Anti-Money Laundering) service provider'
          },
          fraud_control_provider: {
            type: 'enum',
            options: ['enfuce_standard', 'external_provider_a', 'external_provider_b'],
            description: 'Fraud control service provider'
          },
          kyc_level: {
            type: 'enum',
            options: ['basic', 'enhanced', 'full'],
            description: 'Know Your Customer verification level'
          },
          chip_type: {
            type: 'enum',
            options: ['emv', 'contactless', 'dual'],
            description: 'Card chip technology'
          },
          expiry_years: {
            type: 'integer',
            minimum: 1,
            maximum: 10,
            default: 3,
            description: 'Card expiry duration in years'
          }
        },
        description: 'Additional extensible configuration options'
      }
    };

    return res.status(200).json({
      success: true,
      schema,
      version: '1.0.0',
      updated_at: '2024-11-27'
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
