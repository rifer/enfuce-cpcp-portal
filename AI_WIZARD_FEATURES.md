# AI-Powered Wizard Features

The chat wizard now includes advanced AI capabilities for natural language understanding and conversational interactions.

## 🤖 Features

### 1. Natural Language Processing

The wizard understands conversational responses and extracts structured data:

**Examples:**
- Question: "How many cards do you need?"
  - User: "We have about 50 employees" → Extracts: 50
  - User: "around a hundred" → Extracts: 100
  - User: "between 50 and 100" → Extracts: 75 (with confirmation)

- Question: "What currency?"
  - User: "We're based in Sweden" → Extracts: SEK
  - User: "dollars" → Extracts: USD
  - User: "euro" → Extracts: EUR

- Question: "What card type?"
  - User: "for business expenses" → Extracts: corporate
  - User: "fuel cards for vehicles" → Extracts: fleet
  - User: "employee meal benefits" → Extracts: meal

### 2. Conversational Commands

Users can control the wizard with natural commands:

| Command | Aliases | Description |
|---------|---------|-------------|
| `reset` | "start over", "restart", "begin again" | Restart the wizard from the beginning |
| `back` | "previous", "go back", "undo" | Go to the previous question |
| `summary` | "show progress", "what do we have", "review" | Display all collected information |
| `help` | "?", "explain", "what does this mean" | Get help with the current question |
| `skip` | "skip this", "next" | Skip optional questions |
| `edit <field>` | - | Jump to a specific question (e.g., "edit currency") |

### 3. Quick Action Buttons

Visual buttons above the input field for common commands:
- 📊 **Summary** - See what's been collected so far
- ← **Back** - Return to the previous question
- ❓ **Help** - Get help with the current question
- 🔄 **Reset** - Start over (with confirmation)

### 4. AI Provider Support

The wizard supports multiple AI providers with automatic fallback:

#### Local Validation (Default)
- ✅ Free - no API costs
- ✅ Fast - no network latency
- ✅ Rule-based fuzzy matching
- ✅ Keyword detection
- ✅ Number extraction
- ℹ️ Best for: Development and basic validation

#### OpenAI GPT-4 (Optional)
- Environment variable: `OPENAI_API_KEY`
- Model: `gpt-4-turbo-preview`
- Cost: ~$0.02 per conversation
- Best for: Complex natural language understanding

#### Anthropic Claude (Optional)
- Environment variable: `ANTHROPIC_API_KEY`
- Model: `claude-3-sonnet-20240229`
- Cost: ~$0.006 per conversation
- Best for: Cost-effective AI validation

**Auto-fallback:** If AI API fails or is unavailable, the system automatically falls back to local validation.

### 5. Intelligent Validation

The AI validates responses and provides friendly confirmations:

```
User: "We have about 50 people"
AI: "Perfect! I'll set it to 50 cards for your 50 employees. Shall we continue?"
```

Low-confidence responses trigger clarification:

```
User: "for business"
AI: "I understand this is for business use. Which specific type fits best?
• Corporate - General business expenses
• Fleet - Fuel and vehicle costs
• Travel - Travel and accommodation
Which one?"
```

### 6. Conversation History

The wizard maintains conversation context:
- Tracks all questions and answers
- Allows navigation back to previous steps
- Preserves collected data when going back
- Can edit previous answers

### 7. Progress Tracking

Live program summary in the side panel shows:
- ✅ Completed fields with values
- Card preview with current design
- Real-time pricing calculation
- Progress indicator

## 🛠️ Implementation

### API Endpoint: `/api/ai-validate`

**Request:**
```json
{
  "provider": "local|openai|anthropic",
  "action": "validate|clarify|summarize|help",
  "context": {
    "current_question": {
      "field": "estimatedCards",
      "type": "number",
      "question": "How many cards do you need?",
      "options": []
    },
    "user_input": "We have about 50 employees",
    "conversation_history": [...],
    "collected_data": {...}
  }
}
```

**Response:**
```json
{
  "success": true,
  "validated": true,
  "extracted_value": 50,
  "confidence": 0.95,
  "ai_response": "Perfect! I'll set it to 50 cards.",
  "requires_clarification": false
}
```

**Command Response:**
```json
{
  "success": true,
  "is_command": true,
  "command": "summary",
  "command_action": "show_collected_data",
  "ai_response": "Here's what we have so far:\n✅ Program Name: Corporate Cards\n✅ Type: Corporate\n...",
  "data": {...}
}
```

### Frontend Integration

The `handleChatSubmit` function now:
1. Checks for command keywords (reset, back, summary, help)
2. Calls `/api/ai-validate` API
3. Displays AI response with typing animation
4. Handles low-confidence responses with clarification
5. Updates program data with validated values
6. Tracks conversation history
7. Falls back to local parsing if API fails

## 📊 Analytics Tracking

Enhanced event tracking includes:
- `ai_confidence` - Confidence score (0-1) from AI validation
- Command usage tracking
- Validation failures and clarifications
- Reset/back navigation patterns

## 🎨 User Experience

### Visual Indicators
- 🟢 Green pulsing dot: AI is enabled
- Command buttons with hover effects
- Typing indicators during AI processing
- Real-time card preview updates
- Progress indicators

### Helpful Hints
- Welcome message explains available commands
- Tooltip at bottom: "Just type naturally!"
- Context-aware help for each field
- Friendly error messages with suggestions

## 🧪 Example Conversations

### Natural Number Input
```
AI: How many cards do you estimate you'll need?
User: We have about 50 people in the company
AI: Perfect! I'll set it to 50 cards for your 50 employees. Shall we continue?
[Proceeds to next question]
```

### Going Back
```
AI: What currency should the program use?
User: wait, go back
AI: Going back to the previous question...
AI: Which card scheme would you prefer? (Visa or Mastercard)
```

### Progress Summary
```
User: show me what we have so far
AI: Here's what we have so far:

✅ Program Name: Corporate Cards
✅ Type: Corporate
✅ Funding Model: Prepaid
✅ Form Factors: Physical, Virtual
✅ Scheme: Visa

Let's continue with the remaining questions!
```

### Reset with Confirmation
```
User: reset
AI: Are you sure you want to start over? All progress will be lost. Type "yes" to confirm or continue answering the current question.
User: yes
AI: Let's start fresh! What would you like to name your card program?
```

### Unclear Response Clarification
```
AI: What type of card program is this?
User: for business
AI: I understand this is for business use. Which specific type fits best?

• Corporate - General business expenses
• Fleet - Fuel and vehicle costs
• Travel - Travel and accommodation

Which one?
User: corporate
AI: Perfect! I'll set it to Corporate.
```

## 🚀 Activation

### Local Validation (Default - Always Active)
No configuration needed. Works immediately.

### OpenAI (Optional)
```bash
# Add to .env
OPENAI_API_KEY=sk-...your-key-here...
```

Then update the wizard to use OpenAI:
```javascript
setAiProvider('openai')
```

### Anthropic (Optional)
```bash
# Add to .env
ANTHROPIC_API_KEY=sk-ant-...your-key-here...
```

Then update the wizard to use Anthropic:
```javascript
setAiProvider('anthropic')
```

## 💡 Benefits

1. **Better UX** - Users can type naturally instead of selecting from dropdowns
2. **Faster Input** - No need to click through options
3. **Error Prevention** - AI validates and confirms unclear inputs
4. **Flexibility** - Users can navigate back, reset, or see progress anytime
5. **Accessibility** - Works with keyboard-only navigation
6. **Forgiving** - Understands typos, abbreviations, and context
7. **Helpful** - Provides contextual help and suggestions

## 🔧 Customization

### Adding New Commands
Edit `/api/ai-validate.js` → `processCommand()` function

### Changing AI Prompts
Edit `/api/ai-validate.js` → `validateWithOpenAI()` or `validateWithAnthropic()`

### Adding Field-Specific Help
Edit `/api/ai-validate.js` → `getFieldHelp()` function

### Adjusting Confidence Thresholds
Edit `src/EnfucePortal.jsx` → Line 1128:
```javascript
if (result.confidence && result.confidence < 0.7) {
  // Adjust threshold here (0.7 = 70% confidence)
}
```

## 📈 Cost Estimation

### Typical 10-Question Wizard Session

| Provider | Tokens | Cost | Performance |
|----------|--------|------|-------------|
| Local | N/A | $0 | Instant |
| OpenAI GPT-4 | ~2,000 | $0.02 | Excellent |
| Anthropic Claude | ~2,000 | $0.006 | Excellent |

**Recommendation:** Use local validation for development. For production, use Anthropic Claude for best cost/performance balance.

## 🛡️ Error Handling

1. **API Failure** → Automatic fallback to local validation
2. **Network Timeout** → Retry with exponential backoff
3. **Invalid Response** → Show friendly error message
4. **Command Not Found** → Suggest available commands
5. **Unclear Input (3x)** → Show explicit options

## 📝 Files Modified

- `src/EnfucePortal.jsx` - Chat wizard UI and logic
- `api/ai-validate.js` - AI validation endpoint (NEW)
- `ai-wizard-integration.json` - Configuration schema
- `AI_WIZARD_FEATURES.md` - This documentation (NEW)

---

**Ready to use!** The AI wizard is now active with local validation. Add API keys to enable OpenAI or Anthropic for enhanced natural language understanding.
