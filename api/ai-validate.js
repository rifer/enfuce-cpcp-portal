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
    const commandResult = processCommand(user_input, conversation_history, collected_data);
    if (commandResult.is_command) {
      console.log('[AI-Validate] Command detected:', commandResult.command);
      return res.status(200).json({
        success: true,
        is_command: true,
        command: commandResult.command,
        command_action: commandResult.action,
        ai_response: commandResult.response,
        data: commandResult.data
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
function processCommand(input, history, collectedData) {
  const lowerInput = input.toLowerCase().trim();

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

  // Help commands
  if (['help', '?', 'explain', 'what does this mean', 'info'].some(cmd => lowerInput === cmd || lowerInput.includes(cmd))) {
    return {
      is_command: true,
      command: 'help',
      action: 'explain_current_question',
      response: 'I can help you with:\n• Type "reset" to start over\n• Type "back" to go to the previous question\n• Type "summary" to see what we\'ve collected\n• Type "help" for this message\n\nJust answer naturally, and I\'ll understand! For example, if I ask how many cards you need, you can say "about 50" or "we have 50 employees".',
      data: null
    };
  }

  // Skip command
  if (['skip', 'skip this', 'next'].some(cmd => lowerInput === cmd)) {
    return {
      is_command: true,
      command: 'skip',
      action: 'skip_question',
      response: 'Okay, skipping this question.',
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
    return "We haven't collected any information yet. Let's get started!";
  }

  return `Here's what we have so far:\n\n${items.join('\n')}\n\nLet's continue with the remaining questions!`;
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

// Validate field locally without AI
function validateFieldLocally(question, userInput) {
  const field = question.field;
  const type = question.type;
  const lowerInput = userInput.toLowerCase().trim();

  // Number extraction
  if (type === 'number') {
    const numbers = userInput.match(/\d+/g);
    if (numbers && numbers.length > 0) {
      const extractedValue = parseInt(numbers[0]);
      return {
        validated: true,
        extracted_value: extractedValue,
        confidence: 0.9,
        ai_response: `Got it! I'll set it to ${extractedValue}. Shall we continue?`,
        requires_clarification: false
      };
    } else {
      // Try word numbers
      const wordNumbers = {
        'one': 1, 'two': 2, 'three': 3, 'five': 5, 'ten': 10,
        'twenty': 20, 'fifty': 50, 'hundred': 100, 'thousand': 1000
      };

      for (const [word, num] of Object.entries(wordNumbers)) {
        if (lowerInput.includes(word)) {
          return {
            validated: true,
            extracted_value: num,
            confidence: 0.7,
            ai_response: `I understood ${num}. Is that correct?`,
            requires_clarification: false
          };
        }
      }

      return {
        validated: false,
        ai_response: 'I couldn\'t find a number in your response. Could you provide a number?',
        requires_clarification: true
      };
    }
  }

  // Select field fuzzy matching
  if (type === 'select' || type === 'multiple_choice') {
    const options = question.options || [];

    // Try exact match first
    const exactMatch = options.find(opt =>
      opt.toLowerCase() === lowerInput ||
      opt.toLowerCase().includes(lowerInput) ||
      lowerInput.includes(opt.toLowerCase())
    );

    if (exactMatch) {
      return {
        validated: true,
        extracted_value: exactMatch,
        confidence: 0.95,
        ai_response: `Perfect! I'll set it to ${exactMatch}.`,
        requires_clarification: false
      };
    }

    // Fuzzy matching with keywords
    const fuzzyMatches = {
      // Card types
      'corporate': ['business', 'company', 'corporate', 'employee'],
      'fleet': ['fuel', 'gas', 'vehicle', 'fleet'],
      'meal': ['food', 'meal', 'lunch', 'dinner'],
      'travel': ['travel', 'trip', 'accommodation'],
      'gift': ['gift', 'voucher', 'present'],
      'transport': ['transport', 'commute', 'transit'],

      // Funding models
      'prepaid': ['prepaid', 'load', 'advance'],
      'debit': ['debit', 'bank', 'account'],
      'credit': ['credit', 'loan', 'billing'],
      'revolving': ['revolving', 'revolve'],

      // Form factors
      'physical': ['physical', 'plastic', 'card'],
      'virtual': ['virtual', 'digital', 'online'],
      'tokenized': ['tokenized', 'mobile', 'wallet', 'apple', 'google'],

      // Schemes
      'Visa': ['visa', 'v'],
      'Mastercard': ['mastercard', 'mc', 'master'],

      // Currencies
      'EUR': ['eur', 'euro', 'europe'],
      'USD': ['usd', 'dollar', 'us', 'american'],
      'GBP': ['gbp', 'pound', 'sterling', 'uk', 'british'],
      'SEK': ['sek', 'krona', 'sweden', 'swedish']
    };

    for (const [value, keywords] of Object.entries(fuzzyMatches)) {
      if (keywords.some(kw => lowerInput.includes(kw))) {
        return {
          validated: true,
          extracted_value: value,
          confidence: 0.85,
          ai_response: `I understood ${value}. Is that correct?`,
          requires_clarification: false
        };
      }
    }

    return {
      validated: false,
      ai_response: `I'm not sure I understood. The options are: ${options.join(', ')}. Which one would you like?`,
      suggestions: options,
      requires_clarification: true
    };
  }

  // Multi-select
  if (type === 'multi_select' || type === 'multiselect') {
    const options = question.options || [];
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

    // Also check for "both", "all", "and"
    if (lowerInput.includes('both') || lowerInput.includes('all')) {
      if (lowerInput.includes('physical') && lowerInput.includes('virtual')) {
        extracted.push('physical', 'virtual');
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
      ai_response: `I couldn't identify the options. Available: ${options.join(', ')}. Which would you like? (You can choose multiple, separated by commas)`,
      suggestions: options,
      requires_clarification: true
    };
  }

  // Open text (just return as-is)
  if (type === 'open_text' || type === 'text') {
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

  const userPrompt = `I just asked: "${current_question.question}"

They responded: "${user_input}"

Context: We're collecting the "${current_question.field}" field (type: ${current_question.type})${options}

Your job:
1. If it's a GREETING → Respond warmly, then redirect to the question
2. If it says "all" or "all of them" → They want ALL the options
3. If it's a NUMBER WORD (one thousand, fifty) → Convert to digits
4. If it's a TYPO (vorporate, Misa) → Find the closest match smartly
5. If it mentions a LOCATION (Spain, Sweden) → Map to currency
6. If it's a CORRECTION ("no, I meant X") → Extract the new value X
7. If UNCLEAR → Ask a natural follow-up question

Be WARM and CONVERSATIONAL. Don't sound robotic!

Output JSON only (no markdown):
{
  "validated": true/false,
  "extracted_value": value_or_null,
  "confidence": 0.0_to_1.0,
  "ai_response": "conversational, warm, helpful response",
  "requires_clarification": true/false
}

CONVERSATIONAL EXAMPLES:

User: "hello" or "hey, how are you"
Response: {"validated": false, "extracted_value": null, "confidence": 0.0, "ai_response": "Hey! 😊 I'm great, thanks! So, what should we call your card program?", "requires_clarification": true}

User: "all" or "all three" or "all of them" (when asking about physical/virtual/tokenized)
Response: {"validated": true, "extracted_value": ["physical", "virtual", "tokenized"], "confidence": 1.0, "ai_response": "Awesome! We'll include all three - physical cards, virtual cards, and tokenized for mobile wallets. 👍", "requires_clarification": false}

User: "one thousand" (when asking how many cards)
Response: {"validated": true, "extracted_value": 1000, "confidence": 1.0, "ai_response": "Perfect! 1,000 cards it is. That's a nice-sized program!", "requires_clarification": false}

User: "vorporate" (typo for corporate)
Response: {"validated": true, "extracted_value": "corporate", "confidence": 0.95, "ai_response": "Got it - corporate cards for business expenses. Great choice!", "requires_clarification": false}

User: "my clients are in Spain"
Response: {"validated": true, "extracted_value": "EUR", "confidence": 1.0, "ai_response": "Perfect! Since you're in Spain, we'll use EUR (Euro) as the currency. ✓", "requires_clarification": false}

User: "no, I meant 1000 cards" (correction)
Response: {"validated": true, "extracted_value": 1000, "confidence": 1.0, "ai_response": "Ah, got it! Updating that to 1,000 cards. Thanks for clarifying!", "requires_clarification": false}

User: "I want all of the options" (when they previously said something unclear)
Response: {"validated": true, "extracted_value": ["physical", "virtual", "tokenized"], "confidence": 1.0, "ai_response": "Understood! We'll include physical, virtual, and tokenized cards. Perfect! 😊", "requires_clarification": false}`;

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
