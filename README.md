# Enfuce Card Program Configuration Portal (CPCP)

A self-service platform enabling Enfuce customers to design, configure, and manage their card programs through an intuitive web interface backed by a comprehensive API.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-prototype-orange.svg)

## 🎯 Overview

The Card Program Configuration Portal addresses a critical market need: enterprise customers like financial institutions, fintechs, and large organizations require the ability to rapidly deploy and iterate on multiple card programs without deep technical integration or lengthy implementation cycles.

### Key Features

- **Self-Service Program Creation**: 5-step wizard for configuring new card programs
- **Multiple Card Types**: Support for Prepaid, Debit, Credit, and Revolving cards
- **Spend Controls**: Transaction limits, MCC restrictions, geographic controls
- **Real-time Dashboard**: Monitor all programs, cards, and transactions
- **API-First Design**: Full REST API for programmatic access
- **Compliance Built-in**: Automated compliance checks and audit trails

## 📁 Project Structure

```
enfuce-cpcp-portal/
├── docs/
│   └── Enfuce_CPCP_PRD.docx    # Product Requirements Document
├── src/
│   └── EnfucePortal.jsx        # React prototype component
├── public/
│   └── index.html              # HTML entry point
├── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/enfuce-cpcp-portal.git
cd enfuce-cpcp-portal

# Install dependencies
npm install

# Start development server
npm run dev
```

### View the Prototype

Open `http://localhost:5173` in your browser.

## 🎨 Prototype Features

The interactive prototype demonstrates:

1. **Dashboard View**
   - Program overview with key metrics
   - List of existing card programs
   - Quick filters (All, Active, Draft)

2. **Program Creation Wizard**
   - Step 1: Program basics (name, type)
   - Step 2: Card configuration (funding model, form factor, scheme)
   - Step 3: Spend controls (limits, MCC, geography)
   - Step 4: Card design (templates, wallet provisioning)
   - Step 5: Review and launch

3. **Program Detail View**
   - Statistics and metrics
   - Spend control configuration
   - Quick actions (Edit, Issue Card, View Transactions)

4. **API & Webhooks Section**
   - API key management
   - Webhook configuration
   - Quick reference documentation

## 📋 Supported Card Program Types

### By Funding Model
| Type | Description |
|------|-------------|
| Prepaid | Funds loaded in advance |
| Debit | Linked to bank account |
| Credit | Credit line extended |
| Revolving | Replenishing credit |

### By Use Case
| Type | Use Case | MCC Restrictions |
|------|----------|------------------|
| Corporate | Employee expenses | Configurable |
| Fleet/Fuel | Vehicle operations | Gas stations, parking |
| Meal Card | Employee benefits | Restaurants, food delivery |
| Travel | Business trips | Airlines, hotels, transport |
| Gift Card | Rewards & incentives | Optional |
| Transport | Commute expenses | Transit, ride-share |

## 🔌 API Overview

### Core Resources

| Resource | Base Path | Operations |
|----------|-----------|------------|
| Programs | `/v1/programs` | CRUD, activate, suspend, clone |
| Cards | `/v1/cards` | Issue, activate, lock, replace |
| Cardholders | `/v1/cardholders` | CRUD, KYC status, link cards |
| Transactions | `/v1/transactions` | List, filter, export, dispute |
| Spend Controls | `/v1/controls` | CRUD limits, MCC rules |
| Webhooks | `/v1/webhooks` | Subscribe, test, logs |

### Example Request

```bash
curl -X POST https://api.enfuce.com/v1/programs \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "UN Delegate Prepaid",
    "type": "PREPAID",
    "scheme": "VISA",
    "currency": "EUR",
    "spend_controls": {
      "daily_limit": 500,
      "monthly_limit": 5000,
      "allowed_mcc": ["5812", "5814", "4111"]
    }
  }'
```

## 📊 User Personas

1. **Program Administrator** - Manages payment programs across multiple offices
2. **Technical Integrator** - Builds embedded card products via API
3. **Compliance Officer** - Ensures regulatory requirements are met
4. **Finance Manager** - Oversees card programs and expense management

## 🗓️ Roadmap

| Phase | Timeline | Deliverables |
|-------|----------|--------------|
| MVP | Q1 2026 | Core API, prepaid config, basic portal |
| Phase 2 | Q2 2026 | Debit/credit programs, spend controls, webhooks |
| Phase 3 | Q3 2026 | Advanced analytics, compliance dashboard |
| Phase 4 | Q4 2026 | White-label portal, SDK release |

## 📄 Documentation

See the full PRD in `/docs/Enfuce_CPCP_PRD.docx` for:
- Detailed functional requirements
- Non-functional requirements
- API specifications
- Risk analysis
- Success criteria

## 🛠️ Tech Stack

- **Frontend**: React 18 + Tailwind CSS
- **State Management**: React Hooks
- **Build Tool**: Vite
- **API**: REST with JSON payloads

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Built for Enfuce** | Card Issuing & Payment Processing
