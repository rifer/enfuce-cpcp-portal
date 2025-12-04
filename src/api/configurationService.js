/**
 * API service for card configuration management
 * Handles all API calls to the Supabase backend
 */

const API_BASE = '/api/configurations';

/**
 * Get configuration schema
 * @returns {Promise<Object>} Schema definition
 */
export async function getConfigurationSchema() {
  const response = await fetch(`${API_BASE}/schema`);
  if (!response.ok) {
    throw new Error('Failed to fetch configuration schema');
  }
  return response.json();
}

/**
 * List all configurations with optional filters
 * @param {Object} filters - Filter parameters
 * @param {string} filters.client_id - Filter by client ID
 * @param {string} filters.status - Filter by status
 * @param {string} filters.program_type - Filter by program type
 * @param {string} filters.search - Full-text search
 * @param {number} filters.limit - Results limit (default: 50, max: 100)
 * @param {number} filters.offset - Pagination offset
 * @param {string} filters.sort - Sort field
 * @param {string} filters.order - Sort order (asc/desc)
 * @returns {Promise<Object>} List of configurations
 */
export async function listConfigurations(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });

  const response = await fetch(`${API_BASE}?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to list configurations');
  }
  return response.json();
}

/**
 * Create a new card configuration
 * @param {Object} configData - Configuration data
 * @param {string} configData.program_name - Required
 * @param {string} configData.program_type - Required (corporate, fleet, meal, travel, gift, transport)
 * @param {string} configData.funding_model - Required (prepaid, debit, credit, revolving)
 * @param {Array<string>} configData.form_factors - Required (physical, virtual, tokenized)
 * @param {string} configData.card_scheme - Required (Visa, Mastercard)
 * @param {string} configData.currency - Required (EUR, USD, GBP, SEK)
 * @param {string} configData.client_email - Client email (for lookup/creation)
 * @param {string} configData.client_name - Client name (for creation)
 * @param {string} configData.client_company - Client company name (for creation)
 * @param {number} configData.estimated_cards - Estimated number of cards
 * @param {number} configData.daily_limit - Daily spending limit
 * @param {number} configData.monthly_limit - Monthly spending limit
 * @param {string} configData.card_design - Card visual design
 * @param {string} configData.card_color - Card color (hex format)
 * @param {string} configData.card_background_image - Background image URL
 * @param {Array<string>} configData.mcc_restrictions - MCC restrictions (4-digit codes)
 * @param {Array<string>} configData.country_restrictions - Country restrictions (ISO 3166-1 alpha-2)
 * @param {Object} configData.additional_config - Additional extensible configuration
 * @param {string} configData.created_by - Creator identifier
 * @returns {Promise<Object>} Created configuration
 */
export async function createConfiguration(configData) {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(configData),
  });

  const result = await response.json();

  if (!response.ok) {
    // Include detailed error info from API
    const error = new Error(result.error || 'Failed to create configuration');
    error.details = result;
    throw error;
  }

  return result;
}

/**
 * Get a specific configuration by ID
 * @param {string} id - Configuration UUID
 * @returns {Promise<Object>} Configuration data
 */
export async function getConfiguration(id) {
  const response = await fetch(`${API_BASE}/${id}`);
  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error || 'Failed to fetch configuration');
  }
  return response.json();
}

/**
 * Update a configuration
 * @param {string} id - Configuration UUID
 * @param {Object} updateData - Fields to update
 * @param {boolean} partial - If true, uses PATCH (partial update), otherwise PUT (full update)
 * @returns {Promise<Object>} Updated configuration
 */
export async function updateConfiguration(id, updateData, partial = true) {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: partial ? 'PATCH' : 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });

  const result = await response.json();

  if (!response.ok) {
    const error = new Error(result.error || 'Failed to update configuration');
    error.details = result;
    throw error;
  }

  return result;
}

/**
 * Delete a configuration
 * @param {string} id - Configuration UUID
 * @param {boolean} softDelete - If true, archives instead of deleting
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteConfiguration(id, softDelete = false) {
  const url = softDelete ? `${API_BASE}/${id}?soft_delete=true` : `${API_BASE}/${id}`;

  const response = await fetch(url, {
    method: 'DELETE',
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to delete configuration');
  }

  return result;
}

/**
 * Transform wizard data to API format
 * Maps the wizard's internal structure to the API's expected format
 * @param {Object} wizardData - Data from the wizard
 * @param {Object} clientInfo - Optional client information
 * @returns {Object} API-formatted configuration data
 */
export function transformWizardToAPI(wizardData, clientInfo = {}) {
  // Helper function to capitalize first letter (for card schemes)
  const capitalizeFirst = (str) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Helper function to safely convert to uppercase string
  const toUpperCaseString = (value, defaultValue = 'EUR') => {
    if (!value || typeof value !== 'string') return defaultValue;
    return value.toUpperCase();
  };

  // Get card scheme and normalize casing (visa -> Visa, mastercard -> Mastercard)
  const rawScheme = wizardData.scheme || wizardData.card_scheme;
  const cardScheme = capitalizeFirst(rawScheme);

  return {
    // Required fields
    program_name: wizardData.name || wizardData.program_name,
    program_type: (wizardData.type || wizardData.program_type)?.toLowerCase(),
    funding_model: (wizardData.fundingModel || wizardData.funding_model)?.toLowerCase(),
    form_factors: Array.isArray(wizardData.formFactor)
      ? wizardData.formFactor.map(f => f.toLowerCase())
      : (wizardData.form_factors || []).map(f => f.toLowerCase()),
    card_scheme: cardScheme,
    currency: toUpperCaseString(wizardData.currency, 'EUR'),

    // Client information
    client_email: clientInfo.email,
    client_name: clientInfo.name,
    client_company: clientInfo.company,

    // Financial settings
    estimated_cards: wizardData.estimatedCards || wizardData.estimated_cards || 100,
    daily_limit: wizardData.dailyLimit || wizardData.daily_limit || 500,
    monthly_limit: wizardData.monthlyLimit || wizardData.monthly_limit || 5000,

    // Design
    card_design: wizardData.cardDesign || wizardData.card_design || 'corporate',
    card_color: wizardData.cardColor || wizardData.card_color || '#2C3E50',
    card_background_image: wizardData.cardBackgroundImage || wizardData.card_background_image,

    // Restrictions (if provided)
    mcc_restrictions: wizardData.mcc_restrictions || [],
    country_restrictions: wizardData.country_restrictions || [],

    // Additional configuration
    additional_config: wizardData.additional_config || {},

    // Metadata
    created_by: 'wizard',
    status: 'draft',
  };
}
