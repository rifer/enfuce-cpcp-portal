# Enfuce Card Program Configuration API

REST API for managing card program configurations. This API allows you to create, retrieve, update, and delete card program configurations through the Enfuce CPCP portal.

## 📚 Documentation

**Interactive API Documentation (Swagger UI):**
Access the interactive API documentation at: `/api-docs.html`

**OpenAPI Specification:**
Download the OpenAPI 3.0 specification at: `/api-docs.json`

## 🚀 Quick Start

### 1. Setup Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be provisioned (~2 minutes)
3. Go to Project Settings → API to get your credentials:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - Service Role Key (under "service_role" - this is for server-side use)

### 2. Configure Environment Variables

Add the following environment variables to your Vercel project or `.env` file:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

### 3. Initialize Database Schema

Run the SQL schema in your Supabase SQL Editor:

```bash
# Copy the contents of supabase/schema.sql
# Paste into Supabase → SQL Editor → New Query
# Click "Run"
```

This will create:
- `clients` table - Organizations/clients using the portal
- `card_configurations` table - Card program configurations
- `configuration_templates` table - Reusable configuration templates
- `configuration_audit_log` table - Audit trail of all changes
- Indexes, triggers, and Row Level Security policies

### 4. Install Dependencies

```bash
npm install
```

This will install `@supabase/supabase-js` along with other dependencies.

### 5. Test the API

```bash
# Start the development server
npm run dev

# Test the schema endpoint
curl http://localhost:5173/api/configurations/schema

# View interactive documentation
open http://localhost:5173/api-docs.html
```

## 🔌 API Endpoints

### Configuration Schema

**GET** `/api/configurations/schema`
Returns the schema describing all available configuration fields, their types, and validation rules.

**Response:**
```json
{
  "success": true,
  "schema": {
    "program_name": {
      "type": "string",
      "required": true,
      "minLength": 3,
      "maxLength": 255,
      "description": "Name of the card program"
    },
    // ... more fields
  },
  "version": "1.0.0",
  "updated_at": "2024-11-27"
}
```

### List Configurations

**GET** `/api/configurations`
Retrieve a paginated list of configurations with optional filtering and search.

**Query Parameters:**
- `client_id` (uuid) - Filter by client ID
- `status` (enum) - Filter by status: `draft`, `pending_approval`, `active`, `suspended`, `archived`
- `program_type` (enum) - Filter by program type: `corporate`, `fleet`, `meal`, `travel`, `gift`, `transport`
- `search` (string) - Full-text search in program name and type
- `limit` (integer, default: 50, max: 100) - Number of results
- `offset` (integer, default: 0) - Pagination offset
- `sort` (string, default: `created_at`) - Sort field: `created_at`, `updated_at`, `program_name`, `status`
- `order` (string, default: `desc`) - Sort order: `asc`, `desc`

**Example:**
```bash
curl "http://localhost:5173/api/configurations?status=active&limit=10"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "program_name": "Corporate Card Program",
      "program_type": "corporate",
      "status": "active",
      "client": {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com"
      },
      // ... more fields
    }
  ],
  "count": 10,
  "pagination": {
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

### Create Configuration

**POST** `/api/configurations`
Create a new card program configuration.

**Request Body:**
```json
{
  "program_name": "My Corporate Card Program",
  "program_type": "corporate",
  "funding_model": "prepaid",
  "form_factors": ["physical", "virtual"],
  "card_scheme": "Visa",
  "currency": "EUR",
  "estimated_cards": 500,
  "daily_limit": 1000,
  "monthly_limit": 10000,
  "client_email": "client@example.com",
  "client_name": "John Doe",
  "client_company": "Example Corp",
  "additional_config": {
    "card_material": "plastic",
    "aml_provider": "enfuce_standard",
    "fraud_control_provider": "enfuce_standard"
  }
}
```

**Required Fields:**
- `program_name` (string, 3-255 chars)
- `program_type` (enum)
- `funding_model` (enum)
- `form_factors` (array)
- `card_scheme` (enum)
- `currency` (enum)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "program_name": "My Corporate Card Program",
    // ... all configuration fields
    "pricing": {
      "currency": "EUR",
      "setup_fee": 500,
      "monthly_fee": 250,
      "card_issuance_fee": 1000,
      "total_first_month": 1750
    }
  },
  "message": "Configuration created successfully"
}
```

### Get Configuration by ID

**GET** `/api/configurations/{id}`
Retrieve a specific configuration by its UUID.

**Example:**
```bash
curl http://localhost:5173/api/configurations/123e4567-e89b-12d3-a456-426614174000
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "program_name": "My Corporate Card Program",
    // ... all fields
  }
}
```

### Update Configuration

**PUT** `/api/configurations/{id}` or **PATCH** `/api/configurations/{id}`
Update an existing configuration. PUT replaces all fields, PATCH updates only provided fields.

**Request Body:**
```json
{
  "status": "active",
  "daily_limit": 1500,
  "monthly_limit": 15000,
  "updated_by": "admin"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    // ... updated configuration
  },
  "message": "Configuration updated successfully"
}
```

### Delete Configuration

**DELETE** `/api/configurations/{id}`
Delete a configuration. Use `?soft_delete=true` to archive instead of permanently deleting.

**Query Parameters:**
- `soft_delete` (boolean, default: false) - If true, archives instead of deleting

**Examples:**
```bash
# Permanent deletion
curl -X DELETE http://localhost:5173/api/configurations/{id}

# Soft delete (archive)
curl -X DELETE "http://localhost:5173/api/configurations/{id}?soft_delete=true"
```

**Response:**
```json
{
  "success": true,
  "message": "Configuration deleted successfully",
  "deleted_id": "uuid"
}
```

## 💾 Database Schema

### Tables

**clients**
- Organizations/clients using the card program portal
- Fields: `id`, `name`, `email`, `company_name`, `created_at`, `updated_at`

**card_configurations**
- Main table for card program configurations
- Fields:
  - Basic: `id`, `client_id`, `program_name`, `program_type`, `status`
  - Card Config: `funding_model`, `form_factors`, `card_scheme`, `currency`
  - Financial: `estimated_cards`, `daily_limit`, `monthly_limit`
  - Design: `card_design`, `card_color`, `card_background_image`
  - Restrictions: `mcc_restrictions`, `country_restrictions`
  - Extensible: `additional_config` (JSONB - stores card_material, aml_provider, fraud_control_provider, etc.)
  - Metadata: `pricing`, `created_at`, `updated_at`, `created_by`

**configuration_templates**
- Reusable configuration templates/presets
- Fields: `id`, `name`, `description`, `template_data`, `is_public`, `created_at`

**configuration_audit_log**
- Audit trail of all configuration changes
- Fields: `id`, `configuration_id`, `action`, `changed_by`, `changes`, `timestamp`

### Extensible Configuration

The `additional_config` JSONB field allows you to store additional configuration options:

```json
{
  "card_material": "plastic" | "metal" | "recycled" | "biodegradable",
  "aml_provider": "enfuce_standard" | "external_provider_a" | "external_provider_b",
  "fraud_control_provider": "enfuce_standard" | "external_provider_a" | "external_provider_b",
  "kyc_level": "basic" | "enhanced" | "full",
  "chip_type": "emv" | "contactless" | "dual",
  "expiry_years": 1-10
}
```

## 🔒 Security

### Row Level Security (RLS)

The database uses PostgreSQL Row Level Security policies to ensure:
- Only authenticated users can access data
- Clients can only see their own configurations (when auth is implemented)

### CORS

All endpoints support CORS with:
- `Access-Control-Allow-Origin: *`
- Allowed methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`
- Allowed headers: `Content-Type`, `Authorization`

### Environment Variables

**Never commit these to version control:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

Always use environment variables or secure secret management.

## 📊 Pricing Calculation

The API automatically calculates pricing based on configuration:

**Base Fees:**
- Setup Fee: €500
- Monthly Fee: €50 + (cards > 100 ? (cards - 100) × €0.50 : 0)
- Per Card Fee: €2

**Additional Fees:**
- Tokenized/Digital Wallet: +€100 setup
- Credit/Revolving Facility: +€200 setup

**Example:**
- 500 cards, prepaid, physical + tokenized
- Setup: €500
- Monthly: €50 + (400 × €0.50) = €250
- Card Issuance: 500 × €2 = €1,000
- Tokenization: €100
- **Total First Month: €1,850**
- **Monthly Recurring: €250**

## 🧪 Testing

### Test with cURL

```bash
# Get schema
curl http://localhost:5173/api/configurations/schema

# List configurations
curl http://localhost:5173/api/configurations

# Create configuration
curl -X POST http://localhost:5173/api/configurations \
  -H "Content-Type: application/json" \
  -d '{
    "program_name": "Test Program",
    "program_type": "corporate",
    "funding_model": "prepaid",
    "form_factors": ["physical"],
    "card_scheme": "Visa",
    "currency": "EUR",
    "client_email": "test@example.com"
  }'

# Get specific configuration
curl http://localhost:5173/api/configurations/{id}

# Update configuration
curl -X PATCH http://localhost:5173/api/configurations/{id} \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'

# Delete configuration
curl -X DELETE http://localhost:5173/api/configurations/{id}
```

### Test with Postman

1. Import the OpenAPI spec from `/api-docs.json`
2. Set the base URL to your local or deployment URL
3. Use the auto-generated requests

## 🚢 Deployment

### Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel Dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
4. Deploy

### Environment Check

The API will return a 503 error if Supabase is not configured:

```json
{
  "success": false,
  "error": "Database not configured",
  "message": "Supabase credentials are missing. Please configure SUPABASE_URL and SUPABASE_SERVICE_KEY."
}
```

## 📝 Audit Logging

All configuration changes are automatically logged to `configuration_audit_log`:

- **Created** - Initial configuration creation
- **Updated** - Configuration modifications (includes before/after snapshots)
- **Deleted** - Configuration deletion (includes deleted data)
- **Approved** - Status change to active
- **Suspended** - Status change to suspended/archived

Example audit entry:
```json
{
  "id": "uuid",
  "configuration_id": "uuid",
  "action": "updated",
  "changed_by": "admin",
  "changes": {
    "before": { "status": "draft", "daily_limit": 500 },
    "after": { "status": "active", "daily_limit": 1000 },
    "fields_changed": ["status", "daily_limit"]
  },
  "timestamp": "2024-11-27T10:30:00Z"
}
```

## 🛠️ Troubleshooting

### Error: "Database not configured"

**Solution:** Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set in your environment variables.

### Error: "Configuration not found"

**Solution:** Check that the configuration ID is valid and exists in the database.

### Error: "Missing required fields"

**Solution:** Ensure all required fields are provided in the request body. Check the schema endpoint for field requirements.

### Error: "Invalid program_type" (or other enum field)

**Solution:** Use only the allowed values. Check the schema endpoint for valid enum options.

## 📖 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)

## 🤝 Support

For questions or issues with the API, please check:
1. Interactive documentation at `/api-docs.html`
2. OpenAPI spec at `/api-docs.json`
3. This README
4. Supabase project logs (for database errors)
