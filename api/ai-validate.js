// AI Validation API for conversational wizard
// Supports OpenAI, Anthropic, and local validation

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      provider = 'local', // 'openai', 'anthropic', or 'local'
      action, // 'validate', 'clarify', 'summarize', 'help'
      context
    } = req.body;

    const {
      current_question,
      user_input,
      conversation_history = [],
      collected_data = {}
    } = context || {};

    // Debug logging
    console.log('[AI-Validate] Provider requested:', provider);
    console.log('[AI-Validate] ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
    console.log('[AI-Validate] User input:', user_input);

    // Validate required fields
    if (!action || !context || !user_input) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: action, context, user_input'
      });
    }

    // Check for commands first (always local processing)
    const commandResult = processCommand(user_input, conversation_history, collected_data, current_question);
    if (commandResult.is_command) {
      console.log('[AI-Validate] Command detected:', commandResult.command);
      return res.status(200).json({
        success: true,
        provider_used: 'local', // Commands are always processed locally
        is_command: true,
        command: commandResult.command,
        command_action: commandResult.action,
        ai_response: commandResult.response,
        data: commandResult.data,
        validated: false // Commands don't validate the current field
      });
    }

    // Route to appropriate AI provider or local validation
    let result;
    let actualProvider = 'local'; // Track which provider actually worked

    if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      console.log('[AI-Validate] Using OpenAI');
      result = await validateWithOpenAI(action, context);
      actualProvider = result.provider || 'openai'; // Use provider from result if available
    } else if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
      console.log('[AI-Validate] Using Anthropic Claude');
      console.log('[AI-Validate] API Key length:', process.env.ANTHROPIC_API_KEY?.length);
      console.log('[AI-Validate] API Key starts with:', process.env.ANTHROPIC_API_KEY?.substring(0, 10));
      result = await validateWithAnthropic(action, context);
      actualProvider = result.provider || 'anthropic'; // Use provider from result if available
    } else {
      // Fallback to local validation
      console.log('[AI-Validate] Falling back to local validation. Provider:', provider, 'Has API key:', !!process.env.ANTHROPIC_API_KEY);
      result = await validateLocally(action, context);
      actualProvider = 'local';
    }

    return res.status(200).json({
      success: true,
      provider_used: actualProvider, // Use the ACTUAL provider that worked
      ...result
    });

  } catch (error) {
    console.error('AI Validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

// Command processing (reset, back, summary, help, edit, skip)
function processCommand(input, history, collectedData, currentQuestion = {}) {
  const lowerInput = input.toLowerCase().trim();
  const fieldName = currentQuestion.field || 'this question';
  const questionText = currentQuestion.question || 'the current question';

  // Reset commands
  if (['reset', 'start over', 'restart', 'begin again'].some(cmd => lowerInput === cmd || lowerInput.includes(cmd))) {
    return {
      is_command: true,
      command: 'reset',
      action: 'restart_wizard',
      response: 'Are you sure you want to start over? All progress will be lost. Type "yes" to confirm or continue answering the current question.',
      data: null
    };
  }

  // Greeting detection (should not be treated as help) - context-aware
  const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings'];
  if (greetings.some(greeting => lowerInput === greeting || lowerInput.startsWith(greeting + ' ') || lowerInput.startsWith(greeting + ','))) {
    let contextualResponse = 'Hello! 👋 I\'m happy to help you set up your card program. ';

    // Add context based on current field
    if (fieldName === 'program_name') {
      contextualResponse += 'Let\'s start with the program name - what would you like to call it?';
    } else if (fieldName === 'program_type') {
      contextualResponse += 'Now, what card program type are you creating?';
    } else {
      contextualResponse += `Let's continue with ${questionText.toLowerCase()}`;
    }

    return {
      is_command: true,
      command: 'greeting',
      action: 'acknowledge_greeting',
      response: contextualResponse,
      data: null
    };
  }

  // Back/Previous commands
  if (['back', 'previous', 'go back', 'undo'].some(cmd => lowerInput === cmd || lowerInput.includes(cmd))) {
    return {
      is_command: true,
      command: 'back',
      action: 'go_to_previous_question',
      response: 'Going back to the previous question...',
      data: { step_delta: -1 }
    };
  }

  // Summary commands
  if (['summary', 'show progress', 'what do we have', 'review', 'show me'].some(cmd => lowerInput.includes(cmd))) {
    const summaryText = generateSummary(collectedData);
    return {
      is_command: true,
      command: 'summary',
      action: 'show_collected_data',
      response: summaryText,
      data: collectedData
    };
  }

  // Question detection (asking about the current question, not requesting help)
  const questionWords = ['what', 'which', 'why', 'when', 'where', 'who', 'can i', 'could i', 'should i', 'may i', 'is it', 'are there', 'do i', 'does it'];
  const isQuestion = lowerInput.endsWith('?') || questionWords.some(qw => lowerInput.startsWith(qw + ' '));
  const notHelpRequest = !['help', 'explain', 'info', 'what does this mean'].some(cmd => lowerInput.includes(cmd));

  if (isQuestion && notHelpRequest) {
    // Try to provide a helpful answer based on the field and question content
    let helpfulResponse = 'That\'s a good question! ';

    // Check if asking about specific options (e.g., "what's the difference between prepaid and debit?")
    if (currentQuestion.options && currentQuestion.options.length > 0) {
      const mentionedOptions = currentQuestion.options.filter(opt =>
        lowerInput.includes(opt.toLowerCase())
      );

      if (mentionedOptions.length > 0) {
        helpfulResponse += `Let me explain ${mentionedOptions.join(' and ')}: `;
        // Add brief explanations
        helpfulResponse += 'Each option has different characteristics. ';
      }

      helpfulResponse += `The available options are: ${currentQuestion.options.join(', ')}. Which one works best for you?`;
    } else {
      helpfulResponse += 'Just answer naturally with what feels right. For example, if you\'re not sure, you can type what comes to mind and I\'ll understand. Would you like to give it a try?';
    }

    return {
      is_command: true,
      command: 'question',
      action: 'answer_question',
      response: helpfulResponse,
      data: null
    };
  }

  // Help commands - mention "commands" and current question type
  if (['help', '?', 'explain', 'what does this mean', 'info'].some(cmd => lowerInput === cmd || lowerInput.includes(cmd))) {
    const commandsList = '• Type "reset" to start over\n• Type "back" to go to the previous question\n• Type "summary" to see what we\'ve collected\n• Type "help" for this message';

    let helpResponse = `I can help you with these commands:\n${commandsList}\n\n`;
    helpResponse += 'Just answer naturally, and I\'ll understand! ';

    if (currentQuestion.type === 'select' || currentQuestion.type === 'multiselect') {
      helpResponse += `For this question, ${currentQuestion.type === 'multiselect' ? 'you can choose multiple options' : 'choose one option'}.`;
    } else {
      helpResponse += 'Type your answer in any way that feels natural.';
    }

    return {
      is_command: true,
      command: 'help',
      action: 'explain_current_question',
      response: helpResponse,
      data: null
    };
  }

  // Skip command - expanded to include more variations
  const skipPhrases = [
    'skip', 'skip this', 'next', 'pass', 'no', 'none', 'nope',
    'skip it', 'pass this', 'not now', 'later', 'i don\'t know',
    'not sure', 'don\'t know'
  ];

  if (skipPhrases.some(cmd => lowerInput === cmd || lowerInput === cmd + '.')) {
    return {
      is_command: true,
      command: 'skip',
      action: 'skip_question',
      response: 'No problem, we can skip this for now.',
      data: { skip: true }
    };
  }

  // Edit command (e.g., "edit card type", "edit currency")
  const editMatch = lowerInput.match(/edit\s+(.+)/);
  if (editMatch) {
    const field = editMatch[1].trim();
    return {
      is_command: true,
      command: 'edit',
      action: 'jump_to_specific_question',
      response: `Let me take you back to the question about ${field}...`,
      data: { edit_field: field }
    };
  }

  return { is_command: false };
}

// Generate summary of collected data
function generateSummary(collectedData) {
  const items = [];

  if (collectedData.name) items.push(`✅ Program Name: ${collectedData.name}`);
  if (collectedData.type) items.push(`✅ Type: ${collectedData.type.charAt(0).toUpperCase() + collectedData.type.slice(1)}`);
  if (collectedData.fundingModel) items.push(`✅ Funding Model: ${collectedData.fundingModel.charAt(0).toUpperCase() + collectedData.fundingModel.slice(1)}`);
  if (collectedData.formFactor) {
    const factors = Array.isArray(collectedData.formFactor)
      ? collectedData.formFactor.join(', ')
      : collectedData.formFactor;
    items.push(`✅ Form Factors: ${factors}`);
  }
  if (collectedData.scheme) items.push(`✅ Scheme: ${collectedData.scheme}`);
  if (collectedData.currency) items.push(`✅ Currency: ${collectedData.currency}`);
  if (collectedData.estimatedCards) items.push(`✅ Estimated Cards: ${collectedData.estimatedCards}`);
  if (collectedData.dailyLimit) items.push(`✅ Daily Limit: ${collectedData.dailyLimit}`);
  if (collectedData.monthlyLimit) items.push(`✅ Monthly Limit: ${collectedData.monthlyLimit}`);

  if (items.length === 0) {
    return "We haven't collected any information for your program yet. Let's get started so far!";
  }

  return `Here's what we have for your program so far:\n\n${items.join('\n')}\n\nLet's continue with the remaining questions!`;
}

// Local validation (rule-based, no AI API calls)
async function validateLocally(action, context) {
  const { current_question, user_input, collected_data } = context;

  if (action === 'validate') {
    return validateFieldLocally(current_question, user_input);
  } else if (action === 'summarize') {
    return {
      validated: true,
      ai_response: generateSummary(collected_data)
    };
  } else if (action === 'help') {
    return {
      validated: true,
      ai_response: getFieldHelp(current_question)
    };
  }

  return {
    validated: false,
    ai_response: 'I didn\'t understand that. Could you try again?',
    requires_clarification: true
  };
}

// Helper: Calculate Levenshtein distance for typo correction
function levenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

// Helper: Find closest match using fuzzy matching
function findClosestMatch(input, options, threshold = 2) {
  const lowerInput = input.toLowerCase();
  let bestMatch = null;
  let bestDistance = Infinity;

  for (const option of options) {
    const distance = levenshteinDistance(lowerInput, option.toLowerCase());
    if (distance < bestDistance && distance <= threshold) {
      bestDistance = distance;
      bestMatch = option;
    }
  }

  return bestMatch;
}

// Helper: Parse written numbers like "two hundred", "one thousand"
function parseWrittenNumber(text) {
  const lowerText = text.toLowerCase();

  // Handle digit + scale combinations FIRST (e.g., "2 hundred", "5 thousand")
  const digitScalePattern = /(\d+)\s*(hundred|thousand|million)/;
  const digitScaleMatch = lowerText.match(digitScalePattern);

  if (digitScaleMatch) {
    const multiplier = parseInt(digitScaleMatch[1]);
    const scales = { 'hundred': 100, 'thousand': 1000, 'million': 1000000 };
    const scale = scales[digitScaleMatch[2]] || 1;
    return multiplier * scale;
  }

  // Handle compound numbers like "two hundred", "one thousand", "five hundred"
  const compoundPattern = /(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty)\s+(hundred|thousand|million)/;
  const compoundMatch = lowerText.match(compoundPattern);

  if (compoundMatch) {
    const multipliers = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'eleven': 11, 'twelve': 12, 'fifteen': 15, 'twenty': 20,
      'thirty': 30, 'forty': 40, 'fifty': 50
    };
    const scales = { 'hundred': 100, 'thousand': 1000, 'million': 1000000 };

    const multiplier = multipliers[compoundMatch[1]] || 1;
    const scale = scales[compoundMatch[2]] || 1;
    return multiplier * scale;
  }

  // Simple word numbers (but NOT scales standalone - those should not match)
  const wordNumbers = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'fifteen': 15, 'twenty': 20,
    'thirty': 30, 'forty': 40, 'fifty': 50
  };

  for (const [word, value] of Object.entries(wordNumbers)) {
    if (lowerText === word || lowerText.includes(' ' + word + ' ') || lowerText.startsWith(word + ' ') || lowerText.endsWith(' ' + word)) {
      return value;
    }
  }

  return null;
}

// Helper: Map locations to currencies
function mapLocationToCurrency(location) {
  const locationMap = {
    // Eurozone countries
    'italy': 'EUR', 'spain': 'EUR', 'france': 'EUR', 'germany': 'EUR',
    'netherlands': 'EUR', 'belgium': 'EUR', 'austria': 'EUR', 'portugal': 'EUR',
    'greece': 'EUR', 'ireland': 'EUR', 'finland': 'EUR', 'europe': 'EUR',

    // Other currencies
    'usa': 'USD', 'america': 'USD', 'united states': 'USD',
    'uk': 'GBP', 'britain': 'GBP', 'england': 'GBP', 'united kingdom': 'GBP',
    'sweden': 'SEK', 'norway': 'NOK', 'denmark': 'DKK',
    'switzerland': 'CHF', 'poland': 'PLN', 'czech': 'CZK',
    'hungary': 'HUF'
  };

  const lowerLocation = location.toLowerCase();
  for (const [country, currency] of Object.entries(locationMap)) {
    if (lowerLocation.includes(country)) {
      return currency;
    }
  }

  return null;
}

// Validate field locally without AI
function validateFieldLocally(question, userInput) {
  const field = question.field;
  const type = question.type;
  const lowerInput = userInput.toLowerCase().trim();

  // Number extraction
  if (type === 'number') {
    // First, try to evaluate math expressions (handles multiple operators like "2*34*31")
    // Check if input contains math operators
    const mathPattern = /^[\d\s+\-*/×÷,.()]+$/;
    if (mathPattern.test(userInput)) {
      try {
        // Clean up the expression
        const cleanExpression = userInput
          .replace(/,(\d{3})/g, '$1') // Remove thousands separators
          .replace(/×/g, '*')          // Replace × with *
          .replace(/÷/g, '/')          // Replace ÷ with /
          .replace(/\s+/g, '');        // Remove all spaces

        // Safely evaluate the expression using Function constructor
        // This is safe because we've validated the input contains only numbers and math operators
        const result = Function(`'use strict'; return (${cleanExpression})`)();

        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
          return {
            validated: true,
            extracted_value: Math.round(result),
            confidence: 0.95,
            ai_response: `Perfect! ${userInput} = ${Math.round(result)}. I'll use ${Math.round(result)}.`,
            requires_clarification: false
          };
        }
      } catch (error) {
        // Fall through to other parsing methods if evaluation fails
        console.log('Math expression evaluation failed:', error);
      }
    }

    // Second, try written numbers first (e.g., "two hundred", "one thousand")
    const writtenNumber = parseWrittenNumber(userInput);
    if (writtenNumber !== null) {
      return {
        validated: true,
        extracted_value: writtenNumber,
        confidence: 0.95,
        ai_response: `Awesome, ${writtenNumber.toLocaleString()} cards it is! 👍 And what daily spending limit would you like to set for each card (in the selected currency)?`,
        requires_clarification: false
      };
    }

    // Third, try to extract numbers (including those with commas like "2,000")
    // Only match standalone numbers, not digits mixed with letters (e.g., "2hudrez")
    const cleanedInput = userInput.replace(/,(\d{3})/g, '$1'); // Remove commas from numbers

    // Match numbers that are either standalone or followed by whitespace/punctuation
    // Reject if digits are mixed with letters (like "2hudrez")
    const numberPattern = /^(\d+)$|(?:^|\s)(\d+)(?:\s|$)/;
    const numberMatch = cleanedInput.match(numberPattern);

    if (numberMatch) {
      const extractedValue = parseInt(numberMatch[1] || numberMatch[2]);
      return {
        validated: true,
        extracted_value: extractedValue,
        confidence: 0.9,
        ai_response: `Got it! I'll set it to ${extractedValue.toLocaleString()}. Shall we continue?`,
        requires_clarification: false
      };
    }

    // This should not be reached if parseWrittenNumber worked correctly
    // If we get here, the written number parser failed to extract the number

    return {
      validated: false,
      ai_response: 'I couldn\'t find a number in your response. Could you provide a number?',
      requires_clarification: true
    };
  }

  // Select field fuzzy matching
  if (type === 'select' || type === 'multiple_choice') {
    const options = question.options || [];

    // Special handling for currency field - check location mapping
    if (field === 'currency') {
      const mappedCurrency = mapLocationToCurrency(userInput);
      if (mappedCurrency && options.includes(mappedCurrency)) {
        return {
          validated: true,
          extracted_value: mappedCurrency,
          confidence: 0.95,
          ai_response: `Perfect! Going with ${mappedCurrency}.`,
          requires_clarification: false
        };
      }
    }

    // Try exact match first (strict matching only)
    const exactMatch = options.find(opt =>
      opt.toLowerCase() === lowerInput
    );

    if (exactMatch) {
      return {
        validated: true,
        extracted_value: exactMatch,
        confidence: 1.0,
        ai_response: `Perfect! ${exactMatch} it is. ✓`,
        requires_clarification: false
      };
    }

    // Try partial match (but only if input is substantial part of option)
    const partialMatch = options.find(opt => {
      const optLower = opt.toLowerCase();
      const inputLower = lowerInput;
      // Only match if input is at least 50% of the option and matches from start
      return optLower.startsWith(inputLower) && inputLower.length >= optLower.length * 0.5;
    });

    if (partialMatch) {
      return {
        validated: true,
        extracted_value: partialMatch,
        confidence: 0.9,
        ai_response: `Great! ${partialMatch} it is. ✓`,
        requires_clarification: false
      };
    }

    // Try typo correction using Levenshtein distance
    const typoMatch = findClosestMatch(userInput, options, 2);
    if (typoMatch) {
      return {
        validated: true,
        extracted_value: typoMatch,
        confidence: 0.85,
        ai_response: `I think you meant ${typoMatch}? Going with that!`,
        requires_clarification: false
      };
    }

    // Expanded fuzzy matching with many more keywords
    const fuzzyMatches = {
      // Card types
      'corporate': ['business', 'company', 'corporate', 'employee', 'work', 'office', 'enterprise'],
      'fleet': ['fuel', 'gas', 'vehicle', 'fleet', 'car', 'truck', 'diesel'],
      'meal': ['food', 'meal', 'lunch', 'dinner', 'restaurant', 'eat'],
      'travel': ['travel', 'trip', 'accommodation', 'hotel', 'flight'],
      'gift': ['gift', 'voucher', 'present', 'reward'],
      'transport': ['transport', 'commute', 'transit', 'bus', 'train', 'metro'],

      // Funding models
      'prepaid': ['prepaid', 'load', 'advance', 'pre-paid', 'preload'],
      'debit': ['debit', 'bank', 'account', 'checking'],
      'credit': ['credit', 'loan', 'billing', 'invoice', 'bill', 'charge'],
      'revolving': ['revolving', 'revolve', 'rotating'],

      // Form factors
      'physical': ['physical', 'plastic', 'card', 'real', 'tangible'],
      'virtual': ['virtual', 'digital', 'online', 'electronic', 'e-card'],
      'tokenized': ['tokenized', 'mobile', 'wallet', 'apple', 'google', 'samsung', 'pay', 'phone'],

      // Schemes
      'Visa': ['visa', 'v'],
      'Mastercard': ['mastercard', 'mc', 'master'],
      'American Express': ['amex', 'american express', 'americanexpress', 'american', 'express', 'ae', 'amx'],
      'Discover': ['discover'],
      'UnionPay': ['unionpay', 'union pay', 'china unionpay'],
      'JCB': ['jcb', 'japan credit bureau'],

      // ALL Currencies with extensive keywords
      'EUR': ['eur', 'euro', 'euros', 'europe', 'european', '€'],
      'USD': ['usd', 'dollar', 'dollars', 'us', 'american', 'usa', 'united states', '$'],
      'GBP': ['gbp', 'pound', 'pounds', 'sterling', 'uk', 'british', 'britain', 'england', '£'],
      'SEK': ['sek', 'krona', 'kronor', 'sweden', 'swedish'],
      'NOK': ['nok', 'norwegian krone', 'norwegian kroner', 'norway', 'norwegian'],
      'DKK': ['dkk', 'danish krone', 'danish kroner', 'denmark', 'danish'],
      'PLN': ['pln', 'zloty', 'poland', 'polish'],
      'CZK': ['czk', 'koruna', 'czech', 'czechia'],
      'HUF': ['huf', 'forint', 'hungary', 'hungarian'],
      'CHF': ['chf', 'franc', 'swiss', 'switzerland']
    };

    // Check fuzzy matches
    let bestMatch = null;
    let bestKeyword = null;

    for (const [value, keywords] of Object.entries(fuzzyMatches)) {
      for (const kw of keywords) {
        if (lowerInput.includes(kw)) {
          // Check if this option is actually in the available options
          if (options.some(opt => opt.toLowerCase() === value.toLowerCase() || opt === value)) {
            bestMatch = value;
            bestKeyword = kw;
            break;
          }
        }
      }
      if (bestMatch) break;
    }

    if (bestMatch) {
      return {
        validated: true,
        extracted_value: bestMatch,
        confidence: 0.9,
        ai_response: `Perfect! Going with ${bestMatch}.`,
        requires_clarification: false
      };
    }

    // More helpful failure with smart suggestions
    const friendlyMessages = [
      `Let's try this differently - just type one of these: ${options.join(', ')}`,
      `I need one of these specific options: ${options.slice(0, 3).join(', ')}${options.length > 3 ? '...' : ''}`,
      `Pick any: ${options.join(' | ')}`
    ];

    return {
      validated: false,
      ai_response: friendlyMessages[Math.floor(Math.random() * friendlyMessages.length)],
      suggestions: options,
      requires_clarification: true
    };
  }

  // Multi-select
  if (type === 'multi_select' || type === 'multiselect') {
    const options = question.options || [];

    // Check for "all" keyword first - user wants ALL options
    const allPhrases = [
      'all', 'all of them', 'all options', 'all of those', 'them all',
      'everything', 'every option', 'include all', 'all three', 'all 3',
      'every one', 'each one'
    ];

    const wantsAll = allPhrases.some(phrase => lowerInput.includes(phrase)) &&
                     !lowerInput.includes('allow');  // Avoid matching "allow"

    if (wantsAll && options.length > 0) {
      return {
        validated: true,
        extracted_value: options,
        confidence: 1.0,
        ai_response: `Perfect! I'll include all of them: ${options.join(', ')}.`,
        requires_clarification: false
      };
    }

    const values = lowerInput.split(/[,;]/).map(v => v.trim());
    const extracted = [];

    const fuzzyMatches = {
      'physical': ['physical', 'plastic', 'card'],
      'virtual': ['virtual', 'digital', 'online'],
      'tokenized': ['tokenized', 'mobile', 'wallet', 'apple', 'google', 'pay']
    };

    for (const value of values) {
      for (const [option, keywords] of Object.entries(fuzzyMatches)) {
        if (keywords.some(kw => value.includes(kw))) {
          if (!extracted.includes(option)) {
            extracted.push(option);
          }
        }
      }
    }

    // Also check for "both" when there are exactly 2 items mentioned
    if ((lowerInput.includes('both') || lowerInput.includes(' and ')) && extracted.length === 0) {
      // Try to extract from the input
      for (const [option, keywords] of Object.entries(fuzzyMatches)) {
        if (keywords.some(kw => lowerInput.includes(kw))) {
          if (!extracted.includes(option)) {
            extracted.push(option);
          }
        }
      }
    }

    if (extracted.length > 0) {
      return {
        validated: true,
        extracted_value: extracted,
        confidence: 0.85,
        ai_response: `Great! I understood: ${extracted.join(', ')}. Is that right?`,
        requires_clarification: false
      };
    }

    return {
      validated: false,
      ai_response: `I couldn't identify the options. Available: ${options.join(', ')}. Which would you like? (You can choose multiple, separated by commas, or say "all")`,
      suggestions: options,
      requires_clarification: true
    };
  }

  // Open text with validation
  if (type === 'open_text' || type === 'text') {
    const minLength = question.minLength || question.min_length || 0;
    const maxLength = question.maxLength || question.max_length || Infinity;

    // Check minLength
    if (userInput.length < minLength) {
      return {
        validated: false,
        ai_response: `That's a bit too short. Please provide at least ${minLength} characters. Could you give me a more complete answer?`,
        requires_clarification: true
      };
    }

    // Check maxLength
    if (userInput.length > maxLength) {
      return {
        validated: false,
        ai_response: `That's a bit too long. Please keep it under ${maxLength} characters. Could you make it shorter?`,
        requires_clarification: true
      };
    }

    return {
      validated: true,
      extracted_value: userInput,
      confidence: 1.0,
      ai_response: `Perfect! I'll name it "${userInput}".`,
      requires_clarification: false
    };
  }

  return {
    validated: false,
    ai_response: 'I didn\'t quite understand that. Could you try again?',
    requires_clarification: true
  };
}

// Get help text for specific field
function getFieldHelp(question) {
  const helpTexts = {
    'type': 'Card type determines the purpose of your card program:\n• Corporate: General business expenses\n• Fleet/Fuel: Vehicle and fuel costs\n• Meal: Employee meal benefits\n• Travel: Travel and accommodation\n• Gift: Gift cards and vouchers\n• Transport: Commute and transit',

    'fundingModel': 'Funding model determines how cards are loaded:\n• Prepaid: Load funds in advance\n• Debit: Link to bank account\n• Credit: Credit line with monthly billing\n• Revolving: Revolving credit facility',

    'formFactor': 'Form factors are how cardholders access their cards:\n• Physical: Traditional plastic cards\n• Virtual: Digital card numbers only\n• Tokenized: Mobile wallet integration (Apple Pay, Google Pay)\n\nYou can choose multiple!',

    'scheme': 'Card scheme is the payment network:\n• Visa: Widely accepted globally\n• Mastercard: Also widely accepted',

    'currency': 'Choose the primary currency for your card program:\n• EUR: Euro (€)\n• USD: US Dollar ($)\n• GBP: British Pound (£)\n• SEK: Swedish Krona (kr)'
  };

  const field = question.field;
  return helpTexts[field] || 'Just answer naturally! I\'ll understand common phrases and numbers.';
}

// OpenAI validation (requires OPENAI_API_KEY)
async function validateWithOpenAI(action, context) {
  const { current_question, user_input, collected_data } = context;

  const systemPrompt = `You are a helpful assistant for the Enfuce Card Program Creation wizard. Your job is to:
1. Understand user inputs in natural language
2. Extract structured data from conversational responses
3. Validate answers make sense for card program creation
4. Ask clarifying questions when needed
5. Provide helpful explanations
6. Maintain a friendly, professional tone

IMPORTANT RULES:
- For funding models, the ONLY valid options are: prepaid, debit, credit, revolving
- If user says "charge card" or "charge", map it to "credit" (NOT "charge")
- NEVER extract "charge" as a funding model value
- extracted_value MUST exactly match one of the available options (with proper casing)

Current question: ${current_question.question}
Field: ${current_question.field}
Type: ${current_question.type}
Options: ${current_question.options ? current_question.options.join(', ') : 'N/A'}`;

  const userPrompt = action === 'validate'
    ? `User responded: "${user_input}". Extract the appropriate value and validate it. Respond in JSON format with: {"validated": true/false, "extracted_value": value, "confidence": 0-1, "ai_response": "message to user", "requires_clarification": true/false}`
    : action === 'help'
    ? `Explain this question in a helpful way: ${current_question.question}`
    : `Summarize: ${JSON.stringify(collected_data)}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Try to parse as JSON
    try {
      return JSON.parse(aiResponse);
    } catch {
      return {
        validated: true,
        ai_response: aiResponse,
        confidence: 0.8
      };
    }
  } catch (error) {
    console.error('OpenAI error, falling back to local:', error);
    return validateLocally(action, context);
  }
}

// Anthropic validation (requires ANTHROPIC_API_KEY)
async function validateWithAnthropic(action, context) {
  const { current_question, user_input, collected_data } = context;

  const systemPrompt = `You are a friendly, conversational AI assistant helping someone create a card program.

YOUR PERSONALITY:
- Warm, helpful, and enthusiastic
- Patient with typos and unclear responses
- Use emoji sparingly but naturally (😊, ✓, 👍)
- Sound like a helpful human, NOT a robot
- Acknowledge when users seem frustrated or confused
- Celebrate progress ("Great!", "Perfect!", "Almost there!")

CONVERSATION RULES:
1. Greetings (hello, hi, hey): Respond warmly but redirect to the question
2. "All" or "all of them": Understand they want ALL available options
3. Number words: "one thousand" = 1000, "fifty" = 50, "a hundred" = 100
4. Typos: Be smart - "vorporate" = corporate, "Misa" = Visa
5. Locations: "Spain" = EUR, "Sweden" = SEK, "Europe" = EUR, "USA" = USD
6. Corrections: When they say "no" or "I meant X", extract the corrected value
7. Vague answers: Ask clarifying questions naturally
8. Confusion: If they seem lost, explain the question better

BE CONVERSATIONAL:
- Instead of: "I understood corporate. Is that correct?"
- Say: "Got it! Corporate cards for business expenses. Let's continue!"

- Instead of: "I couldn't identify the options"
- Say: "I'm not quite sure what you mean. Would you like physical cards, virtual cards, or both?"

ALWAYS output valid JSON (no markdown formatting)`;

  const options = current_question.options ? `\nAvailable options: ${current_question.options.join(', ')}` : '';

  const minLengthRule = current_question.minLength || current_question.min_length
    ? `\n- minLength: ${current_question.minLength || current_question.min_length} (REJECT if input is shorter!)`
    : '';
  const maxLengthRule = current_question.maxLength || current_question.max_length
    ? `\n- maxLength: ${current_question.maxLength || current_question.max_length} (REJECT if input is longer!)`
    : '';

  const userPrompt = `I just asked: "${current_question.question}"

They responded: "${user_input}"

Context: We're collecting the "${current_question.field}" field (type: ${current_question.type})${options}

CRITICAL FIELD RULES:
- If type is "select" or "multiple_choice" → Extract SINGLE value from available options ONLY
- If type is "multiselect" or "multi_select" → Extract multiple values from available options
- If type is "text" or "open_text" → Preserve EXACT input (don't lowercase, don't extract keywords, keep full text!)${minLengthRule}${maxLengthRule}
- Current field "${current_question.field}" is type: ${current_question.type}

STRICT VALUE MATCHING:
- For select/multiselect: extracted_value MUST match an option EXACTLY (with proper capitalization!)
- Example: If options are ["Visa", "Mastercard"], return "Visa" NOT "visa"
- For text fields: Return the FULL user input exactly as they typed it
- Example: Input "Corporate Travel Card" → Return "Corporate Travel Card" (NOT "corporate travel card" or "Corporate")

CRITICAL VALIDATION RULES:
1. VALIDATE INPUT FIRST against field requirements (minLength, maxLength, options)
2. If input fails validation → Return validated: false with error message
3. DON'T respond with greetings unless input is LITERALLY a greeting word (hello/hi/hey)
4. Invalid inputs like "AB" (too short) or "something weird" (no match) are NOT greetings!
5. NEVER extract values from keywords that belong to OTHER fields:
   - "Visa" is a card_scheme, NOT a program_type, funding_model, or currency
   - "Corporate" is a program_type, NOT a card_scheme
   - Only match if the keyword IS in the current field's available options
   - If user says "Visa" but options are ["Corporate", "Fleet", "Meal"], REJECT with error!

Your job:
1. CHECK VALIDATION FIRST:
   - Text fields: Enforce minLength/maxLength BEFORE any response
   - Select fields: Match to available options OR reject with error
   - Multiselect: ALWAYS return ARRAY (even single values like ["physical"])

2. THEN handle special cases:
   - GREETINGS (literally "hello", "hi", "hey") → Respond warmly, redirect
   - NATURAL LANGUAGE extraction:
     * "for our company's employees" → Extract "corporate"
     * "lunch vouchers" → Extract "meal" (NOT return "lunch vouchers")
     * "we want to preload" or "preload funds" → Extract "prepaid"
     * "charge card" or "I want a charge card" → This means CREDIT, extract "credit"
     * NEVER extract "charge" as a funding model - it's not valid! Map to "credit" instead
   - "ALL" or "all of them":
     * If MULTISELECT → Return ALL options as ARRAY
     * If SINGLE-SELECT → Ask them to pick ONE
   - NUMBER WORDS ("one thousand" → 1000)
   - MATH EXPRESSIONS ("200*30" → 6000)
   - TYPOS ("viza" → "Visa", fuzzy match to closest option)
   - LOCATIONS ("Sweden" → "SEK")
   - QUESTIONS ("can I use more than one?") → Answer, then ask for choice
   - CORRECTIONS ("no, I meant X") → Extract X

For MULTISELECT: Return arrays ALWAYS! Input "physical" → ["physical"]

Output JSON only (no markdown):
{
  "validated": true/false,
  "extracted_value": value_or_null,
  "confidence": 0.0_to_1.0,
  "ai_response": "conversational, warm, helpful response",
  "requires_clarification": true/false
}

CONVERSATIONAL EXAMPLES:

User: "hello" or "hey" (greeting on program_name step)
Response: {"validated": false, "extracted_value": null, "confidence": 0.0, "ai_response": "Hello! 😊 I'm happy to help you set up your card program. Let's start with the program name - what would you like to call it?", "requires_clarification": true}

User: "Corporate Travel Card" (text field - preserve EXACTLY!)
Response: {"validated": true, "extracted_value": "Corporate Travel Card", "confidence": 1.0, "ai_response": "Perfect! 'Corporate Travel Card' it is. Let's continue!", "requires_clarification": false}

User: "AB" (text field with minLength: 3 - must REJECT!)
Response: {"validated": false, "extracted_value": null, "confidence": 0.0, "ai_response": "That's a bit too short. Please provide at least 3 characters for the program name. Could you give me a longer name?", "requires_clarification": true}

User: "corporate" (select field with options [..., "corporate", ...])
Response: {"validated": true, "extracted_value": "corporate", "confidence": 1.0, "ai_response": "Perfect! Corporate cards for business expenses. Let's continue!", "requires_clarification": false}

User: "Visa" (select field - preserve CASE!)
Response: {"validated": true, "extracted_value": "Visa", "confidence": 1.0, "ai_response": "Great! Visa it is. ✓", "requires_clarification": false}

User: "visa" (lowercase - match to "Visa" option with proper case!)
Response: {"validated": true, "extracted_value": "Visa", "confidence": 1.0, "ai_response": "Perfect! Visa card scheme selected. ✓", "requires_clarification": false}

User: "all" (when MULTISELECT field with options ["physical", "virtual", "tokenized"])
Response: {"validated": true, "extracted_value": ["physical", "virtual", "tokenized"], "confidence": 1.0, "ai_response": "Perfect! We'll include all three - physical, virtual, and tokenized. 👍", "requires_clarification": false}

User: "we want to preload the cards" (natural language → "prepaid" from options)
Response: {"validated": true, "extracted_value": "prepaid", "confidence": 0.95, "ai_response": "Got it! Prepaid funding model - you'll load funds in advance. Perfect!", "requires_clarification": false}

User: "fuel cards for our trucks" (natural language → "fleet" from options)
Response: {"validated": true, "extracted_value": "fleet", "confidence": 0.95, "ai_response": "Perfect! Fleet cards for your trucks. Great choice!", "requires_clarification": false}

User: "we're based in Sweden" (location → "SEK" currency)
Response: {"validated": true, "extracted_value": "SEK", "confidence": 1.0, "ai_response": "Perfect! Since you're in Sweden, we'll use SEK. ✓", "requires_clarification": false}

User: "200*30" (math expression)
Response: {"validated": true, "extracted_value": 6000, "confidence": 1.0, "ai_response": "Perfect! 6,000 (200 x 30). That makes sense!", "requires_clarification": false}

User: "AB" (text field with minLength: 3 - MUST REJECT, NOT greet!)
Response: {"validated": false, "extracted_value": null, "confidence": 0.0, "ai_response": "That's a bit too short. Please provide at least 3 characters for the program name.", "requires_clarification": true}

User: "something weird" (select field with specific options - NO MATCH, reject!)
Response: {"validated": false, "extracted_value": null, "confidence": 0.0, "ai_response": "I didn't quite understand that. The options are: corporate, fleet, meal, travel, gift, transport, healthcare, education. Which one would you like?", "requires_clarification": true}

User: "Visa" (on program_type field with options ["Corporate", "Fleet", "Meal"] - REJECT!)
Response: {"validated": false, "extracted_value": null, "confidence": 0.0, "ai_response": "Hmm, 'Visa' isn't one of the available program types. The options are: Corporate, Fleet, Meal, Travel, Gift, Transport, Healthcare, Education. Which type of program would you like to create?", "requires_clarification": true}

User: "This is for our company's employees" (natural language → extract "corporate")
Response: {"validated": true, "extracted_value": "Corporate", "confidence": 0.9, "ai_response": "Perfect! Corporate cards for your company's employees. Great!", "requires_clarification": false}

User: "lunch vouchers" (natural language → extract "meal" from options, NOT return input!)
Response: {"validated": true, "extracted_value": "meal", "confidence": 0.95, "ai_response": "Got it! Meal cards for lunch vouchers. Perfect!", "requires_clarification": false}

User: "physical" (multiselect field - MUST return ARRAY!)
Response: {"validated": true, "extracted_value": ["physical"], "confidence": 1.0, "ai_response": "Great! Physical cards selected.", "requires_clarification": false}

User: "My company's fleet card program" (text field - preserve FULL text exactly!)
Response: {"validated": true, "extracted_value": "My company's fleet card program", "confidence": 1.0, "ai_response": "Perfect! 'My company's fleet card program' it is. Let's continue!", "requires_clarification": false}`;

  try {
    console.log('[Anthropic] Preparing request...');
    console.log('[Anthropic] API Key exists:', !!process.env.ANTHROPIC_API_KEY);
    console.log('[Anthropic] API Key first 15 chars:', process.env.ANTHROPIC_API_KEY?.substring(0, 15));

    const requestBody = {
      model: 'claude-3-haiku-20240307', // Claude 3 Haiku (smallest, fastest, cheapest - should work for everyone)
      max_tokens: 500,
      temperature: 0.3,
      messages: [
        { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }
      ]
    };

    console.log('[Anthropic] Request model:', requestBody.model);
    console.log('[Anthropic] Request message length:', requestBody.messages[0].content.length);
    console.log('[Anthropic] Sending request to API...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('[Anthropic] Response received. Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Anthropic] API error:', response.status, errorText);
      throw new Error(`Anthropic API request failed: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.content[0].text;
    console.log('[Anthropic] Raw response:', aiResponse);

    try {
      // Claude might wrap in markdown code blocks, remove them
      const cleanedResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanedResponse);
      console.log('[Anthropic] Parsed response:', parsed);
      return { ...parsed, provider: 'anthropic' }; // Mark as successfully from Anthropic
    } catch (parseError) {
      console.error('[Anthropic] JSON parse error:', parseError);
      console.error('[Anthropic] Failed to parse:', aiResponse);
      console.log('[Anthropic] Falling back to local due to parse error');
      // Fall back to local validation
      const localResult = await validateLocally(action, context);
      return { ...localResult, provider: 'local' };
    }
  } catch (error) {
    console.error('[Anthropic] Error, falling back to local:', error);
    const localResult = await validateLocally(action, context);
    return { ...localResult, provider: 'local' }; // Mark as local fallback
  }
}
