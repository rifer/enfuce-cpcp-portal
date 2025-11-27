# CrewAI Integration Guide

Complete guide for integrating CrewAI agents with the Enfuce Card Program Creation Portal.

## 📋 Overview

This integration allows CrewAI agents to automatically process wizard responses and create card programs via API calls.

## 📁 Files Included

1. **`wizard-questions.json`** - Complete wizard question schema
2. **`crewai-api-config.json`** - API configuration and mapping
3. **`api/card-program.js`** - Mock API endpoint (replace with real Enfuce API)

## 🔧 Setup

### 1. Install CrewAI Dependencies

```bash
pip install crewai crewai-tools requests python-dotenv
```

### 2. Environment Variables

Create a `.env` file:

```bash
# API Configuration
ENFUCE_API_BASE_URL=https://your-vercel-app.vercel.app
ENFUCE_API_TOKEN=your_api_token_here
ENFUCE_ENVIRONMENT=development  # or production

# Optional: For production
ENFUCE_PRODUCTION_URL=https://api.enfuce.com/v1
```

### 3. CrewAI Agent Setup

```python
from crewai import Agent, Task, Crew
import json
import requests
from typing import Dict, Any

# Load configurations
with open('wizard-questions.json') as f:
    questions = json.load(f)

with open('crewai-api-config.json') as f:
    api_config = json.load(f)

# Create the Card Program Creation Agent
card_program_agent = Agent(
    role='Card Program Specialist',
    goal='Process wizard responses and create card programs via API',
    backstory="""You are an expert in card program creation. You validate
    user inputs, apply business logic, and interact with APIs to create
    card programs efficiently.""",
    verbose=True,
    allow_delegation=False
)
```

## 📊 API Endpoints

### 1. Program Creation (POST)

**Endpoint:** `/api/card-program`

**Request Body:**
```json
{
  "name": "Corporate Card Program",
  "type": "corporate",
  "fundingModel": "prepaid",
  "formFactor": ["physical", "virtual"],
  "scheme": "Visa",
  "currency": "EUR",
  "estimatedCards": 500,
  "dailyLimit": 500,
  "monthlyLimit": 5000
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Card program created successfully",
  "data": {
    "programId": "PROG-1234567890-ABC",
    "status": "active",
    "createdAt": "2025-01-27T10:00:00Z",
    "program": { ... },
    "pricing": {
      "currency": "EUR",
      "total": 3500,
      "monthly": 250,
      "perCard": 7
    },
    "apiCalls": [
      {
        "api": "program_creation",
        "status": "success"
      }
    ],
    "nextSteps": [
      {
        "step": 1,
        "action": "BIN sponsorship",
        "estimatedTime": "1-2 weeks"
      }
    ]
  }
}
```

### 2. Program Retrieval (GET)

**Endpoint:** `/api/card-program?programId=PROG-123`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "programId": "PROG-123",
    "status": "active",
    "message": "Program retrieved successfully"
  }
}
```

### 3. Analytics Tracking (POST)

**Endpoint:** `/api/events`

**Request Body:**
```json
{
  "eventType": "program_created",
  "sessionId": "session_123",
  "wizardVariant": "chat",
  "timestamp": "2025-01-27T10:00:00Z"
}
```

## 🤖 Example CrewAI Task

```python
def create_card_program_task(wizard_responses: Dict[str, Any]) -> Task:
    """
    Create a task for the agent to process wizard responses
    and create a card program.
    """
    return Task(
        description=f"""
        Process the following wizard responses and create a card program:

        {json.dumps(wizard_responses, indent=2)}

        Steps to complete:
        1. Validate all required fields are present
        2. Apply conditional logic based on program type
        3. Call the program creation API
        4. Track analytics event
        5. Return the program ID and next steps
        """,
        agent=card_program_agent,
        expected_output="Program ID and creation confirmation"
    )
```

## 🔀 Conditional Logic

The API automatically applies these rules:

### 1. Corporate Cards
```python
if program['type'] == 'corporate':
    # Enables: Corporate benefits, Expense management features
```

### 2. Enterprise Setup
```python
if program['estimatedCards'] > 1000:
    # Triggers: Enterprise pricing, Dedicated support
```

### 3. Credit Approval
```python
if program['fundingModel'] in ['credit', 'revolving']:
    # Status: Changes to 'pending_approval'
    # Triggers: Credit check process
```

### 4. Mobile Wallet
```python
if 'tokenized' in program['formFactor']:
    # Enables: Apple Pay, Google Pay integration
```

### 5. High Limits Review
```python
if program['dailyLimit'] > 5000 or program['monthlyLimit'] > 50000:
    # Flags: For manual approval
```

## 📝 Field Mapping Reference

| Wizard Field | API Parameter | Type | Required |
|--------------|---------------|------|----------|
| Program Name | `name` | string | ✅ |
| Card Type | `type` | enum | ✅ |
| Funding Model | `fundingModel` | enum | ✅ |
| Form Factors | `formFactor` | array | ✅ |
| Card Scheme | `scheme` | enum | ✅ |
| Currency | `currency` | enum | ✅ |
| Estimated Cards | `estimatedCards` | number | ✅ |
| Daily Limit | `dailyLimit` | number | ✅ |
| Monthly Limit | `monthlyLimit` | number | ✅ |

## 🧪 Testing

### Run Test Scenario

```python
import requests
import json

# Load test scenario
with open('crewai-api-config.json') as f:
    config = json.load(f)

test_case = config['testing']['test_scenarios'][0]

# Make API call
response = requests.post(
    'http://localhost:3000/api/card-program',
    json=test_case['input'],
    headers={'Content-Type': 'application/json'}
)

print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
```

### Expected Results

**Basic Corporate Card:**
- Status: 201 Created
- Program Status: "active"
- Returns: Program ID, pricing, next steps

**Enterprise Credit Cards:**
- Status: 201 Created
- Program Status: "pending_approval"
- Triggers: Enterprise setup + Credit approval

## 🚀 Production Deployment

### 1. Replace Mock API

Update `crewai-api-config.json`:

```json
{
  "api_config": {
    "base_url": "https://api.enfuce.com/v1"
  }
}
```

### 2. Add Real Authentication

```python
import os
from dotenv import load_dotenv

load_dotenv()

headers = {
    'Authorization': f"Bearer {os.getenv('ENFUCE_API_TOKEN')}",
    'Content-Type': 'application/json'
}
```

### 3. Update Endpoints

Replace local endpoints with real Enfuce API endpoints:

```python
PRODUCTION_ENDPOINTS = {
    'program_creation': 'https://api.enfuce.com/v1/programs',
    'card_provisioning': 'https://api.enfuce.com/v1/cards',
    'limits_config': 'https://api.enfuce.com/v1/limits'
}
```

## 📊 Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success (GET) | Process response |
| 201 | Created (POST) | Program created successfully |
| 400 | Bad Request | Check validation errors |
| 401 | Unauthorized | Verify API token |
| 429 | Rate Limited | Retry with backoff |
| 500 | Server Error | Retry up to 3 times |
| 503 | Unavailable | Wait and retry |

## 🛡️ Error Handling

```python
def create_program_with_retry(data: Dict, max_retries: int = 3):
    """Create program with automatic retry logic."""
    for attempt in range(max_retries):
        try:
            response = requests.post(
                f"{BASE_URL}/api/card-program",
                json=data,
                timeout=30
            )

            if response.status_code == 201:
                return response.json()
            elif response.status_code in [429, 500, 503]:
                wait_time = 2 ** attempt  # Exponential backoff
                time.sleep(wait_time)
                continue
            else:
                # Don't retry on client errors
                response.raise_for_status()

        except requests.exceptions.Timeout:
            if attempt < max_retries - 1:
                continue
            raise

    raise Exception(f"Failed after {max_retries} attempts")
```

## 📚 Additional Resources

- **Wizard Questions:** `wizard-questions.json`
- **API Config:** `crewai-api-config.json`
- **Mock API:** `api/card-program.js`
- **Enfuce API Docs:** https://docs.enfuce.com (when available)

## 💡 Tips

1. **Development:** Use the mock API endpoint for testing
2. **Validation:** Always validate required fields before API calls
3. **Logging:** Log all API requests/responses for debugging
4. **Monitoring:** Track success/failure rates
5. **Retry Logic:** Implement exponential backoff for transient failures

## 🆘 Support

For questions about:
- **Wizard Schema:** See `wizard-questions.json`
- **API Mapping:** See `crewai-api-config.json`
- **Mock API:** See `api/card-program.js`
- **Real API:** Contact Enfuce API support

---

**Ready to integrate!** Start with the mock API, test thoroughly, then switch to production endpoints.
