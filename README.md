# ShopOS — AI-First Operating System for Shopify

ShopOS is an AI agent embedded inside the Shopify admin. It replaces dashboards with a conversational workspace — query live store data, surface insights, and execute marketing actions, all through natural language. Every write action is a draft until the human approves it.

---

## What It Does

**Report** Ask anything about your store. Revenue trends, product performance, customer segments, inventory status. Every number comes from a live Shopify GraphQL query.

**Discover** The AI proactively surfaces insights: undermarketed high-margin products, inventory about to run out, customer segments worth targeting. 

**Act** Generate landing pages, create discount codes, update product copy, build email campaigns all from the same conversation. Every action follows a draft → preview → confirm pattern. The chat transcript becomes an audit trail.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Shopify Admin (iframe)               │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │         React Router v7 Frontend                 │  │
│  │                                                  │  │
│  │  AI Workspace: full-height conversational UI     │  │
│  │  Tool results → generative UI components         │  │
│  │  (charts, grids, cards, previews, confirms)      │  │
│  └──────────────────┬──────────────────────────────┘  │
│                     │ SSE stream                       │
│  ┌──────────────────▼──────────────────────────────┐  │
│  │      Server Route: /api/chat (Node.js)           │  │
│  │                                                  │  │
│  │      AI SDK 6 + Claude Sonnet 4                  │  │
│  │                                                  │  │
│  │  READ TOOLS          WRITE TOOLS (preview-first) │  │
│  │  getStoreSummary      generateLiquidPage          │  │
│  │  queryProducts        createDiscountCode          │  │
│  │  queryOrders          updateProductCopy            │  │
│  │  queryCustomers       createKlaviyoAudience        │  │
│  │  queryInventory       sendKlaviyoCampaign          │  │
│  │  compareProducts                                  │  │
│  │                                                  │  │
│  │  ┌────────────────┐   ┌───────────────────┐      │  │
│  │  │ Shopify GraphQL│   │ Klaviyo REST API  │      │  │
│  │  │ Admin API      │   │ (email campaigns) │      │  │
│  │  └────────────────┘   └───────────────────┘      │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Full-stack in one process.** React Router v7 serves both the frontend and the server-side API routes. No separate backend. One deployable unit, one Dockerfile.

**Generative UI, not chat bubbles.** When the AI calls a tool, the frontend renders a typed React component, not a text response. Product grids with images and margin badges, Recharts bar charts, comparison cards with actionable buttons, landing page previews in live iframes. The conversation IS the interface.

**Preview-first mutations.** Every write action returns a preview.

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | React Router v7 | Official Shopify template (Oct 2025+), replaces Remix |
| Shopify API | GraphQL Admin API | REST is legacy since April 2025; all new apps use GraphQL |
| AI | AI SDK 6 + Claude Sonnet 4 | `useChat` hook, typed tool parts for generative UI, SSE streaming |
| UI | Polaris Web Components | Required for embedded Shopify admin apps |
| Charts | Recharts | Lightweight, React-native, composable |
| Analytics | Server-side order aggregation | See design decisions below |
| Email | Klaviyo REST API | Free tier (250 contacts), Shopify-native integration |
| DB | Prisma + SQLite | Session storage only (from Shopify template) |

---

## Design Decisions & Tradeoffs

### Server-side aggregation over ShopifyQL
ShopifyQL (`shopifyqlQuery`) requires the `read_reports` scope, which requires Level 2 protected customer data access configuration. Instead, the `queryOrders` tool fetches raw orders and aggregates server-side — revenue by day, by product, by customer. This is simpler, avoids scope dependencies, and is more reliable on dev stores. The tradeoff: it's bounded by the 250-order query limit per call. In production, you'd move to a persistent analytics layer.

### Preview-first as a product principle
AI connected to live ecommerce data demands a trust layer. The user should see exactly what will happen before it happens. The confirm flow also creates an audit trail: every action in the conversation history is a record of what was proposed and what was approved.

### Klaviyo lists over segments
Klaviyo's Segment API has a complex definition format and a tight rate limit (100 creates/day). Lists are simpler - create, add profiles, target campaign — and achieve the same demo outcome. The agent does all segmentation logic using Shopify data (queryCustomers + queryOrders), then passes emails to Klaviyo as the delivery channel. This means any audience the user describes in natural language works through the same tools.

### AI does the intelligence, APIs do the plumbing
The agent uses Shopify data to reason about which products to push, which customers to target, what copy to write. Klaviyo, Shopify's page builder, and the discount API are execution channels. This separation means adding a new channel (Meta Ads, Google Ads, SMS) is just a new tool - the reasoning layer doesn't change.

---

## Features

### Read Tools
- **Store Summary** KPIs with computed insights: revenue trend vs prior period, inventory velocity alerts, hidden gem detection (high-margin undermarketed products)
- **Product Query** Search/filter with pricing, inventory, margin (from `inventoryItem.unitCost`), and images
- **Order Query** Raw orders or server-side aggregation by day/product/customer
- **Customer Query** Search by name, spend, tags; value tier indicators
- **Inventory Status** Stock levels with color-coded depletion bars and velocity estimates

### Write Tools (all preview-first)
- **Landing Page Generation** AI generates HTML with real product data, images, and discount codes. Preview in iframe → publish to Shopify
- **Discount Code Creation** Percentage or fixed amount, with terms preview → confirm → created in Shopify
- **Product Copy Update** Before/after diff preview → confirm → updated in Shopify
- **Email Audience Creation** AI segments customers using Shopify data → creates Klaviyo list
- **Email Campaign** AI composes subject, body, CTA → preview in iframe → send via Klaviyo

### Generative UI Components
Every tool result renders as a custom React component: KPI dashboards with trend indicators, product grids with images and margin badges, Recharts bar charts, sortable order tables, customer value cards, inventory depletion bars, side-by-side product comparisons, landing page previews, discount code cards, and email campaign previews.

---

## Setup (5 minutes)

### Prerequisites
- Node.js 20+
- [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) (`npm install -g @shopify/cli`)
- A [Shopify Partner account](https://partners.shopify.com) (free)
- An [Anthropic API key](https://console.anthropic.com)
- A [Klaviyo account](https://www.klaviyo.com) (free, optional — for email campaigns)

### Install & Run

```bash
# Clone
git clone https://github.com/cdolan04/gc-ai-demo.git
cd gc-ai-demo

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your ANTHROPIC_API_KEY
# Add your KLAVIYO_API_KEY (optional)

# Seed the dev store with demo data (first time only)
# Requires a Shopify dev store — see "Creating a Dev Store" below
npm run seed

# Start development
shopify app dev
# Press P to open in Shopify admin
```

### Creating a Dev Store
1. Log into [dev.shopify.com](https://dev.shopify.com)
2. Click **Dev stores → Add dev store**
3. Name it anything (e.g., `shopOS-demo`)
4. Do NOT populate with test data — the seed script creates curated data

### Connecting Klaviyo (optional)
1. Create a free account at [klaviyo.com](https://www.klaviyo.com)
2. In Klaviyo: Integrations → Add Shopify → enter your `*.myshopify.com` URL
3. In Klaviyo: Settings → API Keys → Create Private API Key (Full Access)
4. Add the key to `.env` as `KLAVIYO_API_KEY`

---

## Seed Data

The dev store is seeded with curated data designed to surface specific analytical patterns:

- **10 products** (DTC supplement brand) with realistic pricing, cost data (`unitCost`), descriptions, and product images
- **100+ customers** across segments: loyalists, high-value omnivores, bundle buyers, one-time, lapsed, and recent new
- **100+ orders** with distribution patterns that enable insights

The AI discovers these patterns through live queries - nothing is hardcoded.

---

## What Production Looks Like

This is a take home demo. Here's what the production version requires:

- **Persistent analytics**: Postgres or ClickHouse for historical data beyond Shopify's 60-day order window. Webhook-driven sync (`orders/create`, `orders/updated`) instead of polling.
- **Caching layer**: Redis for frequently-queried data (product catalog, recent orders). Shopify's GraphQL rate limits (1000-point bucket) become real constraints at scale.
- **Multi-tenant**: Session-scoped admin clients per store. The current architecture already does this via Shopify's auth middleware — it just needs a real database backing it.
- **Observability**: Structured logging (Pino/Winston), error tracking (Sentry), usage analytics, and token cost monitoring per conversation. The current `console.log` instrumentation becomes structured telemetry.
- **Additional channels**: The tool pattern extends naturally. Meta Ads audience sync, Google Ads campaign creation, SMS via Klaviyo - each is a new tool with the same unerlying AI to Action pattern.
- **Conversation persistence**: Store chat history so the CEO can pick up where they left off. Currently conversations reset on page reload.
- **Plugin architecture**: New data sources and action tools as installable plugins, so the platform extends without touching core code.
- **Theme-integrated pages**: Current landing pages are standalone HTML. Production would generate Shopify theme sections for full design system integration.
- **Theme-integrated pages**: Expansion beyond Shopify native architecture. This can easily be expanded to sit on top of a company Data Warehouse, or ETL to Data Warehouse could be incorporated in the software and/or agency relationship.
---

## Project Structure

```
app/
├── lib/
│   ├── ai/
│   │   ├── tools.ts              # All tool definitions (read + write)
│   │   ├── system-prompt.ts      # System prompt with analytical instructions
│   │   └── shopify-queries.ts    # GraphQL queries and mutations
│   ├── klaviyo/
│   │   └── client.ts             # Klaviyo REST API wrapper
│   └── shopify.server.ts         # Shopify app config
├── components/
│   ├── chat/
│   │   ├── ChatInterface.tsx     # Workspace UI with useChat
│   │   └── MessageRenderer.tsx   # Tool part → generative UI routing
│   └── generative-ui/
│       ├── KPIDashboard.tsx      # Insight cards with trends + alerts
│       ├── ProductGrid.tsx       # Product cards with images + margins
│       ├── SalesChart.tsx        # Recharts revenue visualization
│       ├── OrdersTable.tsx       # Sortable order table
│       ├── CustomerCard.tsx      # Customer list with value tiers
│       ├── InventoryStatus.tsx   # Stock bars with velocity estimates
│       ├── ComparisonCard.tsx    # Side-by-side product comparison
│       ├── LiquidPreview.tsx     # Landing page preview + publish
│       ├── DiscountCard.tsx      # Discount code preview + confirm
│       ├── ProductUpdateConfirm.tsx  # Copy diff + confirm
│       └── EmailCampaignCard.tsx # Audience + campaign preview + send
├── routes/
│   ├── app._index.tsx            # Home: AI workspace
│   ├── api.chat.ts               # AI streaming endpoint
│   └── api.confirm.ts            # Mutation execution endpoint
scripts/
└── seed-store.ts                 # Curated demo data seeding
```
