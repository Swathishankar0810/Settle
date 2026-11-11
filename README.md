# Settle: AI Money Concierge for Shared Spending

> **Tagline:** *End money arguments. Settle shared spending.*  
> **Target Audience:** Roommates, trip groups, student houses, startup teams, and small clubs.  
> **Core Loop:** Upload evidence → AI understands it → Group confirms fairness → PayPal requests payment → Status updates automatically via webhooks.

---

## 🌟 Solution Overview

**Settle** is an AI-powered financial concierge for shared living and group spending. It turns messy receipts, invoices, and subscription bills into transparent, mathematically verified, explainable splits, and then settles them directly through the official **PayPal Invoicing REST API v2**.

The defining innovation of Settle is **not** simply dividing a total number by four. It is:
1. **The Fairness Ledger**: Every split is stored with its exact mathematical rule, individual inputs, group memory exemptions, and plain-English narrative explanation (*"Why does Priya owe $54.27?"*).
2. **Conversational Correction**: Adjust allocations with natural language (*"Priya had two drinks"*, *"Meera doesn't drink alcohol"*, *"Make Uber proportional to distance"*).
3. **Deterministic Allocation Engine**: Mathematical code guarantees zero rounding leakage. Extras (sales tax, tip, service fee) are allocated proportionally to each participant's item consumption, reconciling down to the exact penny.
4. **Group Memory**: Persistent group rules learned across time (*"Meera is exempt from alcohol"*, *"Ravi covers groceries upfront"*, *"Spotify is always four ways"*).
5. **Recurring Cost Radar**: Subscription intelligence that flags shared services, detects unused accounts, calculates monthly and annual leakage, and provides 1-click PayPal invoice dispatch for the next cycle.
6. **Dispute-Safe Human Approval Gate**: The AI never autonomously initiates payments. It proposes, explains, and waits for explicit user confirmation before any PayPal API calls are made.
7. **End-to-End PayPal Lifecycle & Webhooks**: Supports `DRAFT` → `SENT` → `VIEWED` → `PAID` / `CANCELLED` lifecycle, with QR code generation, hosted invoice links, and an asynchronous webhook processor with cryptographic signature verification and event deduplication.

---

## 🏗️ Architecture

```text
               +----------------------------------------------------+
               |                Browser / Web App                   |
               |  (Next.js 14 App Router, TypeScript, Tailwind CSS) |
               +----------------------------------------------------+
                                         |
                                         | Receipt upload / Chat instruction / Approval
                                         v
               +----------------------------------------------------+
               |               Next.js API Routes                   |
               +----------------------------------------------------+
                   |                 |                 |
                   v                 v                 v
           +---------------+ +---------------+ +---------------+
           | AI Vision &   | | Deterministic | | Group Memory  |
           | Extraction    | | Allocation    | | & Sub Radar   |
           | Engine        | | Engine        | | Engine        |
           +---------------+ +---------------+ +---------------+
                   |                 |                 |
                   +--------+--------+--------+--------+
                            |
                            v
               +----------------------------------------------------+
               |           The Fairness Ledger & Database           |
               |    (Supabase Postgres / Embedded Persistence)      |
               +----------------------------------------------------+
                            |
                            | Human Approval Gate Passed
                            v
               +----------------------------------------------------+
               |        PayPal Invoicing REST API Service           |
               | (OAuth2 -> POST /v2/invoicing/invoices -> /send)   |
               +----------------------------------------------------+
                            |                        ^
            Hosted Payment  |                        | Webhook Status
            Link & QR Code  v                        | (SENT / PAID)
               +-----------------------+   +------------------------+
               |  PayPal Sandbox Buyer |-->| /api/webhooks/paypal   |
               |     Payment Page      |   | (Signature & Dedup)    |
               +-----------------------+   +------------------------+
```

---

## 🚀 Key Features & Innovations

### 1. The Fairness Ledger
Every single expense generates an immutable audit record:
- Original extracted receipt line items and tax/tip rates.
- AI assumptions and confidence scores per line item.
- Applied Group Memory rules.
- Complete item-level breakdown per person.
- Proportional sales tax and tip allocation.
- Plain-English explanation generated from structured inputs, avoiding hallucinated numbers:
  > **Why does Priya owe $54.27?**  
  > *Priya ordered Pan-Seared Pacific Salmon ($29.50), shared 2x Craft Hazy IPA with Ravi ($9.00), and shared Truffle Parm Fries across 4 people ($3.13). She owes $12.64 in proportional sales tax (8.5%) and tip (18%). This allocation respects group rule #1 (Meera is exempt from alcohol).*

### 2. Conversational Money Assistant
Instead of tapping complex spreadsheet forms, users can adjust splits using natural language:
- *"Priya had two drinks"*
- *"Meera doesn't drink alcohol"*
- *"Make Uber split by distance (Ravi 25km, Priya 12km, Jefisha 18km)"*
- *"Ravi paid upfront for everyone"*
- *"Split evenly instead"*

The assistant interprets intent, updates assignments, re-runs the deterministic math engine, and adds an audit entry to the ledger.

### 3. Recurring Cost Radar
Subscription bills (Spotify, Netflix, PureGym, Google One) are automatically cataloged:
- Computes household monthly spend ($92.98/mo) and annual run rate ($1,115.76/yr).
- Highlights waste: Flags gym memberships with 0 check-ins in 48 days ($540/yr savings).
- Detects streaming over-provisioning: Downgrading 4-screen Netflix to standard for 3 active watchers ($90/yr savings).
- 1-click PayPal invoice generation for the upcoming billing cycle.

### 4. Group Memory
A persistent rule engine that retains household habits across all bills:
- `Alcohol Exemption`: Meera does not consume alcohol and is exempt from bar line items.
- `Grocery Reimbursement`: Ravi covers groceries upfront and is credited as payer.
- `Equal Subscription Split`: Shared subscriptions are divided four ways equally.

### 5. PayPal Invoicing REST API & Webhook Lifecycle
- Generates professional PayPal invoices via OAuth2 client credentials.
- Creates draft invoice with line items, recipient billing info, and custom invoice numbers.
- Sends invoices directly to group members' PayPal Sandbox accounts.
- Generates scan-to-pay QR codes and hosted payment links.
- Public Webhook endpoint (`/api/webhooks/paypal`) verifies cryptographic transmission signatures (`paypal-transmission-sig`), deduplicates by `event_id`, and reconciles ledger state upon `INVOICING.INVOICE.PAID`.
- Includes a live **PayPal Webhook Inspector & Simulator** right in the UI for seamless demo evaluation.

---

## 🎬 3 Built-In Demo Scenarios

Settle comes pre-loaded with three realistic, end-to-end demo scenarios accessible with a single click:

| Scenario | Bill Amount | Key Capabilities Demonstrated |
|---|---|---|
| **🍝 Joe's Copper Bistro** | **$201.14** | Itemized dining split, Meera alcohol exemption, proportional tax (8.5%) & tip (18%), human approval gate, PayPal invoice issuance. |
| **🌲 Lake Tahoe Cabin & Trip** | **$665.00** | Multi-category travel (cabin rental, gas, camp groceries, park pass), non-driver exclusions, upfront payer reimbursement to Jefisha. |
| **📡 Household Subscriptions** | **$92.98 / mo** | Spotify Family, Netflix 4K, Google One, and PureGym. Flags $630/yr in unused service savings and handles recurring invoicing. |

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14+ (App Router, Server Components & Route Handlers)
- **Language:** TypeScript 5 (Strict Mode)
- **Styling:** Tailwind CSS, Lucide React Icons
- **Payments:** PayPal Invoicing REST API v2 (`/v2/invoicing/invoices`), OAuth2 Client Credentials
- **AI Extraction & Reasoning:** OpenAI (`gpt-4o`, `gpt-4o-mini`) & Google Gemini API, with built-in resilient heuristic fallbacks
- **Database & Persistence:** PostgreSQL / Supabase ready (`supabase/schema.sql` included) + embedded persistence engine for zero-configuration hackathon evaluation
- **Interactive UI:** Canvas Confetti, Real-time Webhook Simulator, QR Code Renderer

---

## ⚙️ Environment Variables & Setup

Create a `.env.local` file in the root directory:

```env
# PayPal Sandbox Credentials
# https://developer.paypal.com/dashboard/applications/sandbox
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PAYPAL_BUSINESS_EMAIL=sb-organizer@business.example.com
PAYPAL_WEBHOOK_ID=your_registered_webhook_id
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com

# AI Vision & Reasoning Models (Optional - Smart local fallback provided)
OPENAI_API_KEY=your_openai_key
OPENAI_VISION_MODEL=gpt-4o
OPENAI_TEXT_MODEL=gpt-4o-mini
GEMINI_API_KEY=your_gemini_key

# Supabase (Optional - schema provided in /supabase/schema.sql)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_SECRET=settle_secure_random_key_98765
```

### Installation & Run

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Open browser
http://localhost:3000
```

---

## 🔒 Security & Dispute-Safe Principles

1. **Human Approval Gate:** AI acts solely as a concierge; it never autonomously transfers funds or issues debt obligations without explicit user confirmation.
2. **No Card Data Stored:** All payment data is handled exclusively within PayPal's PCI-compliant hosted checkout.
3. **Server-Side Secrets:** Client ID and Secret are strictly protected within server-side API routes and are never exposed to the client bundle.
4. **Webhook Security:** Webhook payloads verify PayPal's cryptographic signature headers (`paypal-transmission-sig`, `paypal-auth-algo`, `paypal-cert-url`) and prevent replay attacks with unique event ID deduplication.

---

## 🌏 Scope & India Payment Notice
*PayPal India currently supports cross-border / international transactions and does not support domestic resident-to-resident consumer transfers. Settle is demonstrated using the **PayPal Developer Sandbox in USD**. For a production deployment serving Indian domestic groups, settlement rails can be paired with local domestic payment partners (such as UPI/Razorpay) while retaining Settle's explainable Fairness Ledger, Group Memory, and Subscription Radar.*
