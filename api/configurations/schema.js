/**
 * GET /api/configurations/schema
 * Returns the schema/possible configurations for card programs
 * This helps clients understand what fields are available and their constraints
 *
 * Now database-driven: Fetches available options from lookup tables
 */

import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient.js';

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
    // Fallback options if database query fails
    const fallbackOptions = {
      cardSchemes: ['Visa', 'Mastercard', 'American Express', 'Discover', 'UnionPay', 'JCB'],
      programTypes: ['corporate', 'fleet', 'meal', 'travel', 'gift', 'transport', 'healthcare', 'education'],
      fundingModels: ['prepaid', 'debit', 'credit', 'revolving'],
      formFactors: ['physical', 'virtual', 'tokenized'],
      currencies: ['EUR', 'USD', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF'],
      statuses: ['draft', 'pending_approval', 'active', 'suspended', 'archived']
    };

    let dynamicOptions = fallbackOptions;

    // Fetch dynamic options from database if available
    if (isSupabaseConfigured()) {
      try {
        const [
          { data: cardSchemes },
          { data: programTypes },
          { data: fundingModels },
          { data: formFactors },
          { data: currencies },
          { data: statuses }
        ] = await Promise.all([
          supabase.from('card_schemes').select('code, display_name').eq('is_active', true).order('sort_order'),
          supabase.from('program_types').select('code, display_name').eq('is_active', true).order('sort_order'),
          supabase.from('funding_models').select('code, display_name').eq('is_active', true).order('sort_order'),
          supabase.from('form_factors').select('code, display_name').eq('is_active', true).order('sort_order'),
          supabase.from('currencies').select('code, display_name, symbol').eq('is_active', true).order('sort_order'),
          supabase.from('configuration_statuses').select('code, display_name').eq('is_active', true).order('sort_order')
        ]);

        // Use database values if available, otherwise fallback
        dynamicOptions = {
          cardSchemes: cardSchemes?.map(s => s.code) || fallbackOptions.cardSchemes,
          cardSchemesWithLabels: cardSchemes || [],
          programTypes: programTypes?.map(t => t.code) || fallbackOptions.programTypes,
          programTypesWithLabels: programTypes || [],
          fundingModels: fundingModels?.map(f => f.code) || fallbackOptions.fundingModels,
          fundingModelsWithLabels: fundingModels || [],
          formFactors: formFactors?.map(f => f.code) || fallbackOptions.formFactors,
          formFactorsWithLabels: formFactors || [],
          currencies: currencies?.map(c => c.code) || fallbackOptions.currencies,
          currenciesWithLabels: currencies || [],
          statuses: statuses?.map(s => s.code) || fallbackOptions.statuses,
          statusesWithLabels: statuses || []
        };

        console.log('✅ Schema loaded from database - includes:', {
          cardSchemes: dynamicOptions.cardSchemes.length,
          programTypes: dynamicOptions.programTypes.length,
          fundingModels: dynamicOptions.fundingModels.length
        });
      } catch (dbError) {
        console.warn('⚠️  Database query failed, using fallback options:', dbError.message);
        // Continue with fallback options
      }
    } else {
      console.warn('⚠️  Supabase not configured, using fallback options');
    }

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
        options: dynamicOptions.programTypes,
        optionsWithLabels: dynamicOptions.programTypesWithLabels || [],
        description: 'Type of card program'
      },
      status: {
        type: 'enum',
        required: false,
        default: 'draft',
        options: dynamicOptions.statuses,
        optionsWithLabels: dynamicOptions.statusesWithLabels || [],
        description: 'Current status of the program'
      },
      funding_model: {
        type: 'enum',
        required: true,
        options: dynamicOptions.fundingModels,
        optionsWithLabels: dynamicOptions.fundingModelsWithLabels || [],
        description: 'How the card is funded'
      },
      form_factors: {
        type: 'array',
        required: true,
        items: {
          type: 'enum',
          options: dynamicOptions.formFactors,
          optionsWithLabels: dynamicOptions.formFactorsWithLabels || []
        },
        description: 'Card form factors (can select multiple)'
      },
      card_scheme: {
        type: 'enum',
        required: true,
        options: dynamicOptions.cardSchemes,
        optionsWithLabels: dynamicOptions.cardSchemesWithLabels || [],
        description: 'Card payment network'
      },
      currency: {
        type: 'enum',
        required: true,
        default: 'EUR',
        options: dynamicOptions.currencies,
        optionsWithLabels: dynamicOptions.currenciesWithLabels || [],
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
