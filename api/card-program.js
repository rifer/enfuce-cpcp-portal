// Mock API endpoint for card program creation
// Replace this with real Enfuce API calls in production

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const programData = req.body;

      // Validate required fields
      const requiredFields = ['name', 'type', 'fundingModel', 'scheme', 'currency'];
      const missingFields = requiredFields.filter(field => !programData[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          missingFields
        });
      }

      // Simulate API processing delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate mock program ID
      const programId = `PROG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();

      // Calculate pricing based on program details
      const pricing = calculateProgramPricing(programData);

      // Simulate conditional API calls
      const apiCalls = [];

      // Always: Create program
      apiCalls.push({
        api: 'program_creation',
        status: 'success',
        timestamp: new Date().toISOString()
      });

      // Conditional: Enterprise setup for high volume
      if (programData.estimatedCards && programData.estimatedCards > 1000) {
        apiCalls.push({
          api: 'enterprise_setup',
          status: 'success',
          message: 'Enterprise pricing and support enabled',
          timestamp: new Date().toISOString()
        });
      }

      // Conditional: Credit approval for credit funding
      if (programData.fundingModel === 'credit' || programData.fundingModel === 'revolving') {
        apiCalls.push({
          api: 'credit_approval',
          status: 'pending',
          message: 'Credit check initiated - approval within 24-48 hours',
          timestamp: new Date().toISOString()
        });
      }

      // Conditional: Corporate benefits for corporate cards
      if (programData.type === 'corporate') {
        apiCalls.push({
          api: 'corporate_benefits',
          status: 'success',
          message: 'Corporate expense management features enabled',
          timestamp: new Date().toISOString()
        });
      }

      // Configure spending limits
      apiCalls.push({
        api: 'limits_configuration',
        status: 'success',
        limits: {
          daily: programData.dailyLimit || 500,
          monthly: programData.monthlyLimit || 5000
        },
        timestamp: new Date().toISOString()
      });

      // Card provisioning setup
      apiCalls.push({
        api: 'card_provisioning',
        status: 'success',
        formFactors: programData.formFactor || ['physical'],
        scheme: programData.scheme || 'Visa',
        timestamp: new Date().toISOString()
      });

      // Mock response mimicking real API
      return res.status(201).json({
        success: true,
        message: 'Card program created successfully',
        data: {
          programId,
          status: 'active',
          createdAt: new Date().toISOString(),
          program: {
            ...programData,
            id: programId,
            status: programData.fundingModel === 'credit' ? 'pending_approval' : 'active'
          },
          pricing,
          apiCalls,
          nextSteps: generateNextSteps(programData),
          documentation: {
            apiReference: '/docs/api',
            sdkDownload: '/downloads/sdk',
            integrationGuide: '/docs/integration'
          }
        }
      });

    } catch (error) {
      console.error('Error creating card program:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // GET endpoint - retrieve program details
  if (req.method === 'GET') {
    const { programId } = req.query;

    if (!programId) {
      return res.status(400).json({
        success: false,
        error: 'Missing programId parameter'
      });
    }

    // Mock program retrieval
    return res.status(200).json({
      success: true,
      data: {
        programId,
        status: 'active',
        message: 'Program retrieved successfully (mock data)'
      }
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Helper function to calculate pricing
function calculateProgramPricing(program) {
  let total = 0;
  const breakdown = {};

  // Base setup fee
  breakdown.setupFee = 500;
  total += breakdown.setupFee;

  // Card type multiplier
  const typeMultipliers = {
    prepaid: 1.0,
    debit: 1.2,
    credit: 1.5,
    revolving: 1.8
  };
  const typeMultiplier = typeMultipliers[program.fundingModel] || 1.0;

  // Form factor costs
  const formFactorCosts = {
    physical: 2,
    virtual: 0.5,
    tokenized: 1
  };

  breakdown.formFactorCost = 0;
  if (program.formFactor && Array.isArray(program.formFactor)) {
    program.formFactor.forEach(ff => {
      breakdown.formFactorCost += (formFactorCosts[ff] || 0) * (program.estimatedCards || 100);
    });
  }
  total += breakdown.formFactorCost;

  // Monthly platform fee
  breakdown.monthlyFee = 99 * typeMultiplier;
  const annualPlatformFee = breakdown.monthlyFee * 12;
  total += annualPlatformFee;

  // Transaction fees
  const schemeFees = {
    Visa: 0.10,
    Mastercard: 0.12
  };
  const avgTransactionsPerCard = 50;
  breakdown.annualTransactionFees =
    (schemeFees[program.scheme] || 0.10) *
    (program.estimatedCards || 100) *
    avgTransactionsPerCard;
  total += breakdown.annualTransactionFees;

  return {
    currency: program.currency || 'EUR',
    total: Math.round(total),
    breakdown,
    monthly: Math.round((total - breakdown.setupFee) / 12),
    perCard: program.estimatedCards > 0 ? Math.round(total / program.estimatedCards) : 0,
    annualRecurring: Math.round(total - breakdown.setupFee)
  };
}

// Generate next steps based on program configuration
function generateNextSteps(program) {
  const steps = [];

  if (program.fundingModel === 'credit' || program.fundingModel === 'revolving') {
    steps.push({
      step: 1,
      action: 'Complete credit approval',
      description: 'Submit required financial documents for credit assessment',
      estimatedTime: '24-48 hours'
    });
  }

  steps.push({
    step: steps.length + 1,
    action: 'BIN sponsorship',
    description: 'Secure BIN sponsor agreement for card issuance',
    estimatedTime: '1-2 weeks'
  });

  steps.push({
    step: steps.length + 1,
    action: 'Card design approval',
    description: 'Finalize card design and branding elements',
    estimatedTime: '3-5 days'
  });

  if (program.formFactor && program.formFactor.includes('physical')) {
    steps.push({
      step: steps.length + 1,
      action: 'Physical card production',
      description: 'Order and produce physical cards',
      estimatedTime: '2-3 weeks'
    });
  }

  steps.push({
    step: steps.length + 1,
    action: 'Integration & testing',
    description: 'Integrate API and test card functionality',
    estimatedTime: '1-2 weeks'
  });

  steps.push({
    step: steps.length + 1,
    action: 'Go live',
    description: 'Launch card program to end users',
    estimatedTime: '1 day'
  });

  return steps;
}
