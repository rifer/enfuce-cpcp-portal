/**
 * /api/configurations/[id]
 * GET - Retrieve a specific configuration by ID
 * PUT/PATCH - Update a configuration
 * DELETE - Delete a configuration
 */

import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, PATCH, DELETE, OPTIONS');
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

  // Extract ID from URL
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Missing configuration ID'
    });
  }

  try {
    if (req.method === 'GET') {
      return await handleGetConfiguration(req, res, id);
    } else if (req.method === 'PUT' || req.method === 'PATCH') {
      return await handleUpdateConfiguration(req, res, id);
    } else if (req.method === 'DELETE') {
      return await handleDeleteConfiguration(req, res, id);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Configuration API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

/**
 * GET /api/configurations/[id]
 * Retrieve a specific configuration by ID
 */
async function handleGetConfiguration(req, res, id) {
  const { data, error } = await supabase
    .from('card_configurations')
    .select(`
      *,
      client:clients(id, name, email, company_name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found',
        message: `No configuration found with ID: ${id}`
      });
    }

    console.error('Supabase query error:', error);
    return res.status(500).json({
      success: false,
      error: 'Database query failed',
      message: error.message
    });
  }

  return res.status(200).json({
    success: true,
    data
  });
}

/**
 * PUT/PATCH /api/configurations/[id]
 * Update a configuration
 */
async function handleUpdateConfiguration(req, res, id) {
  const updateData = req.body;

  // First check if configuration exists
  const { data: existing, error: fetchError } = await supabase
    .from('card_configurations')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found',
        message: `No configuration found with ID: ${id}`
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Database query failed',
      message: fetchError.message
    });
  }

  // Validate enum fields if provided (case-insensitive)
  if (updateData.program_type) {
    const validProgramTypes = ['corporate', 'fleet', 'meal', 'travel', 'gift', 'transport'];
    if (!validProgramTypes.includes(updateData.program_type?.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid program_type',
        received: updateData.program_type,
        validValues: validProgramTypes
      });
    }
    updateData.program_type = updateData.program_type.toLowerCase();
  }

  if (updateData.funding_model) {
    const validFundingModels = ['prepaid', 'debit', 'credit', 'revolving'];
    if (!validFundingModels.includes(updateData.funding_model?.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid funding_model',
        received: updateData.funding_model,
        validValues: validFundingModels
      });
    }
    updateData.funding_model = updateData.funding_model.toLowerCase();
  }

  if (updateData.card_scheme) {
    const validSchemes = ['Visa', 'Mastercard'];
    const normalizedScheme = updateData.card_scheme?.charAt(0).toUpperCase() + updateData.card_scheme?.slice(1).toLowerCase();
    if (!validSchemes.includes(normalizedScheme)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid card_scheme',
        received: updateData.card_scheme,
        validValues: validSchemes
      });
    }
    updateData.card_scheme = normalizedScheme;
  }

  if (updateData.status) {
    const validStatuses = ['draft', 'pending_approval', 'active', 'suspended', 'archived'];
    if (!validStatuses.includes(updateData.status?.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        received: updateData.status,
        validValues: validStatuses
      });
    }
    updateData.status = updateData.status.toLowerCase();
  }

  // Normalize form_factors if provided
  if (updateData.form_factors && Array.isArray(updateData.form_factors)) {
    updateData.form_factors = updateData.form_factors.map(f => f.toLowerCase());
  }

  // Normalize currency if provided
  if (updateData.currency) {
    updateData.currency = updateData.currency.toUpperCase();
  }

  // Recalculate pricing if financial parameters changed
  if (updateData.estimated_cards || updateData.form_factors || updateData.funding_model) {
    const configForPricing = { ...existing, ...updateData };
    updateData.pricing = calculatePricing(configForPricing);
  }

  // Prepare update data (remove fields that shouldn't be updated directly)
  const { id: _id, created_at, created_by, client, ...allowedUpdates } = updateData;

  // Perform update
  const { data, error } = await supabase
    .from('card_configurations')
    .update(allowedUpdates)
    .eq('id', id)
    .select(`
      *,
      client:clients(id, name, email, company_name)
    `)
    .single();

  if (error) {
    console.error('Supabase update error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update configuration',
      message: error.message
    });
  }

  // Log to audit trail
  await supabase.from('configuration_audit_log').insert({
    configuration_id: id,
    action: 'updated',
    changed_by: updateData.updated_by || 'api',
    changes: {
      before: existing,
      after: data,
      fields_changed: Object.keys(allowedUpdates)
    }
  });

  return res.status(200).json({
    success: true,
    data,
    message: 'Configuration updated successfully'
  });
}

/**
 * DELETE /api/configurations/[id]
 * Delete a configuration
 */
async function handleDeleteConfiguration(req, res, id) {
  const { soft_delete } = req.query; // Optional: ?soft_delete=true for archiving instead of deleting

  // First check if configuration exists
  const { data: existing, error: fetchError } = await supabase
    .from('card_configurations')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found',
        message: `No configuration found with ID: ${id}`
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Database query failed',
      message: fetchError.message
    });
  }

  // Soft delete: update status to 'archived'
  if (soft_delete === 'true') {
    const { data, error } = await supabase
      .from('card_configurations')
      .update({ status: 'archived' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to archive configuration',
        message: error.message
      });
    }

    // Log to audit trail
    await supabase.from('configuration_audit_log').insert({
      configuration_id: id,
      action: 'suspended',
      changed_by: req.body?.deleted_by || 'api',
      changes: { archived: true }
    });

    return res.status(200).json({
      success: true,
      data,
      message: 'Configuration archived successfully'
    });
  }

  // Hard delete: permanently remove from database
  const { error } = await supabase
    .from('card_configurations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Supabase delete error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete configuration',
      message: error.message
    });
  }

  // Log to audit trail (before cascade deletes it)
  await supabase.from('configuration_audit_log').insert({
    configuration_id: id,
    action: 'deleted',
    changed_by: req.body?.deleted_by || 'api',
    changes: { deleted_config: existing }
  });

  return res.status(200).json({
    success: true,
    message: 'Configuration deleted successfully',
    deleted_id: id
  });
}

/**
 * Calculate pricing based on configuration
 * (Shared with main configurations endpoint)
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
