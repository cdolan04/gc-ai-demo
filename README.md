# Growth Capital AI — Shopify Store Analyst

An AI-powered Shopify embedded app that gives store owners a conversational analyst. Ask questions about your store, get data-driven insights with rich visualizations, and take action — all from a single chat interface.

**The pitch:** Stop digging through your Shopify admin. Just ask.

## What It Does

- **Read**: Query products, orders, customers, and inventory via natural language
- **Visualize**: Interactive charts, tables, KPI cards, and product grids rendered inline in the chat
- **Act**: Draft landing pages, discount codes, and product copy updates — all preview-first with explicit user approval
- **Reason**: Proactively surfaces business insights and suggests next actions

## Quick Start (5 minutes)

### Prerequisites

- Node.js >= 20.19
- [Shopify Partner account](https://partners.shopify.com) (free)
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli): `npm install -g @shopify/cli`
- Shopify dev store (create via [dev.shopify.com](https://dev.shopify.com))
- [Anthropic API key](https://console.anthropic.com)

### Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd gc-ai-demo
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 3. Start the app
shopify app dev
# Press P to open in Shopify admin
```

### Seed Demo Data

The app is most impressive with curated seed data (10 products, 150+ customers, 200+ orders across a DTC supplement brand). To seed:

1. In your Shopify dev store, go to **Settings → Apps → Develop apps**
2. Create an app, grant all Admin API scopes, install it
3. Copy the **Admin API access token**
4. Run:

```bash
SHOPIFY_STORE=your-store.myshopify.com SHOPIFY_ACCESS_TOKEN=shpat_xxx npm run seed
```

The script is idempotent — safe to re-run.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Shopify Admin                        │
│   (Embedded App via App Bridge iframe)                 │
├──────────────────────────────────────────────────────┤
│                                                        │
│  React Router v7 Frontend                              │
│  ├── Auto-loaded KPI cards + 30-day sparkline          │
│  └── Chat UI (AI SDK useChat)                          │
│        └── tool part type → generative UI component    │
│                    │ SSE stream                         │
│  Server Route: /api/chat (Node.js)                     │
│  ├── AI SDK streamText() + Claude Sonnet 4             │
│  ├── 9 tools (5 read, 1 comparison, 3 preview-first)  │
│  └── Shopify GraphQL Admin API                         │
│                                                        │
└──────────────────────────────────────────────────────┘
```

**Full-stack in one process.** React Router v7 handles both frontend and server-side routes. No separate backend. One deployable unit.

## Design Decisions

### AI-First Interface
Every interaction is conversational. The UI is generated dynamically based on data. No static dashboard pages.

### Preview-First Mutations
All write actions follow **draft → preview → confirm**. The agent never mutates store state without explicit user approval. The chat transcript serves as an audit trail.

### Server-Side Analytics
Rather than using ShopifyQL (which requires `read_reports` scope and protected customer data access), order analytics are computed server-side. The `queryOrders` tool fetches orders and aggregates by day, product, or customer. Simpler, more reliable on dev stores, no scope dependencies.

### Tool-Grounded Answers
The agent never hallucinate store metrics. Every number comes from a Shopify GraphQL API call. If the agent doesn't have data, it queries for it first.

## Tools

| Tool | Type | Purpose |
|------|------|---------|
| `getStoreSummary` | Read | KPIs: revenue, orders, AOV, low-stock alerts |
| `queryProducts` | Read | Products with pricing, inventory, margin data, images |
| `queryOrders` | Read | Orders + server-side aggregation (by day/product/customer) |
| `queryCustomers` | Read | Customer search with LTV and order history |
| `queryInventory` | Read | Stock levels by product/variant/location |
| `compareProducts` | Analysis | Side-by-side comparison with insight |
| `generateLiquidPage` | Write | Landing page preview → confirm → publish |
| `createDiscountCode` | Write | Discount code preview → confirm → create |
| `updateProductCopy` | Write | Title/description diff → confirm → update |

## Generative UI Components

Each tool renders a custom React component inline in the chat:

- **KPIDashboard** — metric cards with low-stock alerts
- **ProductGrid** — product cards with images, margin badges, inventory
- **OrdersTable** — sortable table with status badges
- **SalesChart** — Recharts bar chart (lazy-loaded)
- **CustomerCard** — customer list with value tier indicators
- **InventoryStatus** — color-coded stock level bars
- **ComparisonCard** — side-by-side product analysis
- **LiquidPreview** — HTML page preview in iframe + Publish button
- **DiscountCard** — branded discount card + Confirm button
- **ProductUpdateConfirm** — before/after diff + Confirm button

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | React Router v7 | Official Shopify standard (replaces Remix) |
| Shopify API | GraphQL Admin API | REST is legacy; GraphQL required for new apps |
| AI | AI SDK 6 + Claude Sonnet 4 | Typed tool parts, SSE streaming, generative UI |
| UI | Polaris Web Components | Required for embedded Shopify admin apps |
| Charts | Recharts (lazy-loaded) | Lightweight, React-native, composable |
| DB | Prisma + SQLite | Session storage only (from template) |

## Project Structure

```
app/
├── lib/ai/
│   ├── tools.ts              # 9 tool definitions + confirmation executors
│   ├── system-prompt.ts      # Agent system prompt
│   └── shopify-queries.ts    # GraphQL queries and mutations
├── components/
│   ├── chat/
│   │   ├── ChatInterface.tsx  # Main chat UI with useChat
│   │   └── MessageRenderer.tsx # tool type → generative UI component
│   └── generative-ui/         # 10 visual components
├── routes/
│   ├── app._index.tsx         # Home: KPI dashboard + chat
│   ├── api.chat.ts            # AI streaming endpoint
│   └── api.confirm.ts         # Mutation confirmation endpoint
scripts/
└── seed-store.ts              # Curated data seeding (idempotent)
```

## What Production Would Look Like

This is a demo, not a production SaaS. In production:

- **Database**: Postgres instead of SQLite, with cached analytics
- **Multi-tenant**: Session isolation, per-store rate limiting
- **Caching**: Redis for Shopify API responses, reduce latency
- **Observability**: Structured logging, error tracking, usage analytics
- **Additional channels**: Klaviyo for email campaigns, GA4 for attribution
- **Theme integration**: Shopify Online Store 2.0 sections instead of standalone pages
