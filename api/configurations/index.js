/**
 * /api/configurations
 * GET - List all configurations (with optional filters)
 * POST - Create new configuration
 */

import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'Database not configured',
      message: 'Supabase credentials are missing. Please configure SUPABASE_URL and SUPABASE_SERVICE_KEY.'
    });
  }

  try {
    if (req.method === 'GET') {
      return await handleGetConfigurations(req, res);
    } else if (req.method === 'POST') {
      return await handleCreateConfiguration(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Configurations API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

/**
 * GET /api/configurations
 * List all configurations with optional filters
 */
async function handleGetConfigurations(req, res) {
  const {
    client_id,
    status,
    program_type,
    limit = 50,
    offset = 0,
    search,
    sort = 'created_at',
    order = 'desc'
  } = req.query;

  let query = supabase
    .from('card_configurations')
    .select(`
      *,
      client:clients(id, name, email, company_name)
    `);

  // Apply filters
  if (client_id) {
    query = query.eq('client_id', client_id);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (program_type) {
    query = query.eq('program_type', program_type);
  }

  if (search) {
    query = query.textSearch('search_vector', search);
  }

  // Apply sorting
  const validSortFields = ['created_at', 'updated_at', 'program_name', 'status'];
  const sortField = validSortFields.includes(sort) ? sort : 'created_at';
  const sortOrder = order === 'asc' ? true : false;

  query = query.order(sortField, { ascending: sortOrder });

  // Apply pagination
  const limitNum = Math.min(parseInt(limit) || 50, 100); // Max 100
  const offsetNum = parseInt(offset) || 0;

  query = query.range(offsetNum, offsetNum + limitNum - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Supabase query error:', error);
    return res.status(500).json({
      success: false,
      error: 'Database query failed',
      message: error.message
    });
  }

  return res.status(200).json({
    success: true,
    data: data || [],
    count: data?.length || 0,
    pagination: {
      limit: limitNum,
      offset: offsetNum,
      hasMore: data?.length === limitNum
    }
  });
}

/**
 * POST /api/configurations
 * Create a new card program configuration
 */
async function handleCreateConfiguration(req, res) {
  const configData = req.body;

  // Validate required fields
  const requiredFields = [
    'program_name',
    'program_type',
    'funding_model',
    'form_factors',
    'card_scheme',
    'currency'
  ];

  const missingFields = requiredFields.filter(field => !configData[field]);
  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      missingFields
    });
  }

  // Validate enum fields
  const validProgramTypes = ['corporate', 'fleet', 'meal', 'travel', 'gift', 'transport'];
  if (!validProgramTypes.includes(configData.program_type)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid program_type',
      validValues: validProgramTypes
    });
  }

  const validFundingModels = ['prepaid', 'debit', 'credit', 'revolving'];
  if (!validFundingModels.includes(configData.funding_model)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid funding_model',
      validValues: validFundingModels
    });
  }

  const validSchemes = ['Visa', 'Mastercard'];
  if (!validSchemes.includes(configData.card_scheme)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid card_scheme',
      validValues: validSchemes
    });
  }

  // Get or create client
  let clientId = configData.client_id;

  if (!clientId && configData.client_email) {
    // Try to find existing client by email
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('email', configData.client_email)
      .single();

    if (existingClient) {
      clientId = existingClient.id;
    } else {
      // Create new client
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          name: configData.client_name || 'Unknown',
          email: configData.client_email,
          company_name: configData.client_company || null
        })
        .select()
        .single();

      if (clientError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to create client',
          message: clientError.message
        });
      }

      clientId = newClient.id;
    }
  }

  // Calculate pricing if needed
  const pricing = calculatePricing(configData);

  // Prepare configuration data
  const newConfig = {
    client_id: clientId || null,
    program_name: configData.program_name,
    program_type: configData.program_type,
    status: configData.status || 'draft',
    funding_model: configData.funding_model,
    form_factors: configData.form_factors,
    card_scheme: configData.card_scheme,
    currency: configData.currency,
    estimated_cards: configData.estimated_cards || 100,
    daily_limit: configData.daily_limit || 500,
    monthly_limit: configData.monthly_limit || 5000,
    card_design: configData.card_design || 'corporate',
    card_color: configData.card_color || '#2C3E50',
    card_background_image: configData.card_background_image || null,
    mcc_restrictions: configData.mcc_restrictions || [],
    country_restrictions: configData.country_restrictions || [],
    additional_config: configData.additional_config || {},
    pricing,
    created_by: configData.created_by || 'wizard'
  };

  const { data, error } = await supabase
    .from('card_configurations')
    .insert(newConfig)
    .select(`
      *,
      client:clients(id, name, email, company_name)
    `)
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create configuration',
      message: error.message
    });
  }

  // Log to audit trail
  await supabase.from('configuration_audit_log').insert({
    configuration_id: data.id,
    action: 'created',
    changed_by: configData.created_by || 'wizard',
    changes: { initial_config: newConfig }
  });

  return res.status(201).json({
    success: true,
    data,
    message: 'Configuration created successfully'
  });
}

/**
 * Calculate pricing based on configuration
 */
function calculatePricing(config) {
  const baseFees = {
    setup: 500,
    monthly: 50,
    perCard: 2
  };

  const cardCount = config.estimated_cards || 100;
  const setupFee = baseFees.setup;
  const monthlyFee = baseFees.monthly + (cardCount > 100 ? (cardCount - 100) * 0.5 : 0);
  const cardIssuanceFee = cardCount * baseFees.perCard;

  // Additional fees based on configuration
  let additionalFees = 0;

  if (config.form_factors?.includes('tokenized')) {
    additionalFees += 100; // Digital wallet setup
  }

  if (config.funding_model === 'credit' || config.funding_model === 'revolving') {
    additionalFees += 200; // Credit facility setup
  }

  const total = setupFee + monthlyFee + cardIssuanceFee + additionalFees;

  return {
    currency: config.currency || 'EUR',
    setup_fee: setupFee,
    monthly_fee: monthlyFee,
    card_issuance_fee: cardIssuanceFee,
    additional_fees: additionalFees,
    total_first_month: setupFee + monthlyFee + cardIssuanceFee + additionalFees,
    monthly_recurring: monthlyFee,
    breakdown: {
      base_setup: baseFees.setup,
      base_monthly: baseFees.monthly,
      per_card_fee: baseFees.perCard,
      card_count: cardCount,
      features: {
        tokenization: config.form_factors?.includes('tokenized') ? 100 : 0,
        credit_facility: (config.funding_model === 'credit' || config.funding_model === 'revolving') ? 200 : 0
      }
    }
  };
}
