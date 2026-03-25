# ShopOS — Architecture & Build Plan

> **Purpose of this document**: Complete build plan for a Shopify embedded app that lets a store owner interact with their data through an AI agent. Written as both a Claude Project context document (for asking questions and iterating on design) and a Claude Code roadmap (for phased execution). No code lives here — decisions, architecture, specs, and sequencing only.

## Project Name: `growth-capital-shopify-ai`

---

## 1. What We're Building

An AI-powered Shopify app that embeds inside the Shopify admin. A brand CEO installs it and gets a conversational AI analyst that can:

- **Read**: Query products, orders, customers, inventory via natural language
- **Visualize**: Render interactive charts, tables, KPI cards, and product grids inline in the chat (generative UI)
- **Act**: Draft landing pages, discount codes, product copy updates, and email campaigns — all preview-first with explicit user approval before any mutation
- **Reason**: Proactively surface business insights ("this product is undermarketed") and suggest next actions

The pitch to a CEO: **"Stop digging through your Shopify admin. Just ask."**

This is not a chat bolted onto a dashboard. The AI IS the interface.

---

## 2. Design Principles

### 2a. AI-First Interface
Every interaction is conversational. The UI is generated dynamically based on data. There are no static dashboard pages to maintain.

### 2b. Tool-Grounded Answers
The agent NEVER hallucinate store metrics. Every number shown in the UI comes from a tool call to the Shopify API. If the agent doesn't have data, it queries for it first.

### 2c. Preview-First Mutations
**All write actions follow a draft → preview → confirm pattern.** The agent never mutates store state without explicit user approval. Every write tool returns a preview (page preview, discount code summary, product copy diff, email campaign preview). The user sees exactly what will happen and clicks "Confirm" to execute. This is a deliberate product decision: AI + ecommerce data demands a trust layer. The chat transcript serves as an audit trail of every action taken.

### 2d. Minimum Viable Magic
We're building a CTO-level demo, not a proof of concept. But we're also not building a production SaaS. Every feature should be complete enough to be compelling in a Loom, but we don't spend cycles on edge cases that won't appear in the demo.

---

## 3. Architecture

### 3a. How Shopify Embedded Apps Work
Shopify apps run on YOUR infrastructure and load inside the Shopify admin via an iframe. Shopify doesn't host your code — they point the iframe at your URL. During development, `shopify app dev` creates a Cloudflare tunnel so Shopify can reach your localhost.

### 3b. Full-Stack in One Process
React Router v7 is a full-stack framework. Server-side route handlers (loaders and actions) run on Node.js in the same process as the frontend. There is no separate backend service.

- Frontend sends request to a React Router server route
- Server route authenticates with Shopify, makes GraphQL calls, streams Claude responses
- Response streams back to the frontend via SSE

One deployable unit. One Dockerfile. One container.

### 3c. Data Strategy
No persistent data store beyond Prisma/SQLite for Shopify session management (comes with the template). All store data is queried live from Shopify's GraphQL Admin API on every request. Analytics are computed via **server-side aggregation of order data**, not ShopifyQL (see Section 18 for rationale). Klaviyo data is queried live from the Klaviyo REST API.

### 3d. Diagram

```
┌──────────────────────────────────────────────────────────┐
│                     Shopify Admin                         │
│   (Embedded App via App Bridge iframe)                    │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────┐      │
│  │          React Router v7 Frontend                │      │
│  │                                                  │      │
│  │  Home Screen (app._index.tsx)                    │      │
│  │  ├── Auto-loaded KPI cards (revenue, orders,     │      │
│  │  │   AOV, low-stock alerts)                      │      │
│  │  ├── 30-day sales trend sparkline                │      │
│  │  └── Chat panel with welcome message             │      │
│  │                                                  │      │
│  │  Chat UI (useChat from AI SDK 5.0)               │      │
│  │  ├── Text input                                  │      │
│  │  └── Message renderer: tool part type →          │      │
│  │      generative UI component                     │      │
│  └───────────────────┬─────────────────────────────┘      │
│                      │ SSE stream                          │
│  ┌───────────────────▼─────────────────────────────┐      │
│  │    Server Route: /api/chat (Node.js)             │      │
│  │                                                  │      │
│  │    AI SDK 5.0 streamText()                       │      │
│  │    Model: Claude Sonnet 4                        │      │
│  │                                                  │      │
│  │    READ TOOLS            WRITE TOOLS (preview-   │      │
│  │    ─────────             first, user confirms)   │      │
│  │    queryProducts          generateLiquidPage      │      │
│  │    queryOrders            createDiscountCode      │      │
│  │    queryCustomers         updateProductCopy       │      │
│  │    queryInventory         createKlaviyoSegment    │      │
│  │    getStoreSummary        sendKlaviyoCampaign     │      │
│  │                                                  │      │
│  │    ┌────────────────┐  ┌──────────────────┐      │      │
│  │    │ Shopify GraphQL│  │  Klaviyo REST    │      │      │
│  │    │ Admin API      │  │  API             │      │      │
│  │    └────────────────┘  └──────────────────┘      │      │
│  └──────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────┘
```

### 3e. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | React Router v7 (Shopify template) | Official Shopify standard as of Oct 2025, replaces Remix |
| Shopify API | GraphQL Admin API only | REST is legacy since April 2025; GraphQL required for all new apps |
| AI | Vercel AI SDK 5.0 + Claude Sonnet 4 | `useChat` hook, typed tool parts for generative UI, SSE streaming. Claude for best-in-class tool use. |
| UI | Polaris Web Components | Required for embedded Shopify admin apps; auto-matches admin design |
| DB | Prisma + SQLite | From template; handles session storage only |
| Charts | Recharts | Lightweight, React-native, composable |
| Analytics | Server-side order aggregation | Avoids ShopifyQL's protected customer data requirements; more reliable on dev stores |
| Email (stretch) | Klaviyo REST API | Free up to 250 contacts; sandbox with sample data generation |

### 3f. Package Philosophy
Every major package is the official/standard choice. `@shopify/shopify-app-react-router` for auth, Polaris for UI, AI SDK for the chat layer. Rolling your own would be a red flag. The skill being evaluated is how well you compose and orchestrate these tools, not whether you can rewrite OAuth from scratch.

---

## 4. Prerequisites & Setup

### 4a. Accounts Needed
1. **Shopify Partner account** (free) → [partners.shopify.com](https://partners.shopify.com)
2. **Anthropic API key** → [console.anthropic.com](https://console.anthropic.com)
3. **Klaviyo account** (free, up to 250 contacts) → [klaviyo.com](https://www.klaviyo.com) — mark as test account in settings (Phase 5 stretch only)

### 4b. Create Development Store
1. Log into Dev Dashboard at [dev.shopify.com](https://dev.shopify.com)
2. Click **Dev stores → Add dev store**
3. Name: `gc-ai-demo`
4. **Do NOT populate with test data** — we seed our own curated data (see Section 7)
5. Store URL: `gc-ai-demo.myshopify.com`

### 4c. Scaffold the App
```bash
npm install -g @shopify/cli
shopify app init --template=https://github.com/Shopify/shopify-app-template-react-router
```

This gives you: React Router v7 + Vite, Shopify auth/session/API, Prisma + SQLite, Polaris web components, App Bridge, OAuth + webhooks, Dockerfile.

### 4d. Configure Access Scopes
In `shopify.app.toml`:
```toml
scopes = "read_products,write_products,read_orders,read_customers,read_inventory,read_content,write_content,read_themes,write_themes,read_discounts,write_discounts"
```

Scope justifications:
- `read_products` / `write_products` — catalog queries + product copy updates
- `read_orders` — order history and revenue analysis (last 60 days by default, which is fine for our seeded data)
- `read_customers` — customer data, LTV, segmentation
- `read_inventory` — stock levels and velocity
- `read_content` / `write_content` — page creation for Liquid generation
- `read_themes` / `write_themes` — theme access for Liquid generation
- `read_discounts` / `write_discounts` — discount code creation

**Scopes we intentionally avoid:**
- `read_all_orders` — requires Partner Dashboard approval. Our seed data is within 60 days, so unnecessary.
- `read_reports` — required for `shopifyqlQuery`, but also requires protected customer data access configuration. We avoid this entirely by doing server-side order aggregation instead (see Section 18).

### 4e. Install Dependencies
```bash
npm install ai @ai-sdk/anthropic @ai-sdk/react zod recharts
```

### 4f. Start Development
```bash
shopify app dev
```
Creates Cloudflare tunnel, updates Partner Dashboard URLs, enables HMR. Press `P` to open app in Shopify admin.

### 4g. Git Setup
```bash
git init
git remote add origin git@github.com:YOUR_USERNAME/growth-capital-shopify-ai.git
```
`.env` in `.gitignore`. Include `.env.example` with placeholder keys.

---

## 5. Home Screen Design

The app delivers value on first load. No blank chat box.

### 5a. Layout (top to bottom)
1. **KPI Cards** (3-4 cards, auto-loaded via server-side loader):
   - Orders this week
   - Revenue this week
   - Average order value
   - Low-stock product count (inventory < 10 units)
2. **30-day sales sparkline** (Recharts, from loader data)
3. **Chat panel** with welcome message:
   > "I'm your store analyst. I pulled today's snapshot above — ask me anything to dig deeper, or tell me to take action like creating a landing page or discount code."

### 5b. Implementation
- Route: `app/routes/app._index.tsx`
- Loader fires GraphQL queries server-side on page load (same queries as `getStoreSummary` tool)
- KPI cards and chart render from loader data — no AI call needed
- Chat panel uses `useChat` from `@ai-sdk/react`
- Evaluator sees a polished dashboard the moment the app opens

---

## 6. AI Agent: Tools

### 6a. Read Tools

| Tool Name | Purpose | Data Source |
|-----------|---------|-------------|
| `getStoreSummary` | KPIs: total products, recent order count, revenue, AOV, low-stock alerts | Multiple Shopify GraphQL queries combined |
| `queryProducts` | Search/filter products; returns title, price, variants, inventory, images, margin (from variant's `inventoryItem.unitCost`) | `products(query, first)` |
| `queryOrders` | Orders by date range, status, customer; line items, totals, fulfillment status. Also used for analytics — the tool can aggregate revenue by day/product/customer server-side. | `orders(query, first)` with server-side aggregation |
| `queryCustomers` | Customer search; order count, lifetime spend, last order date, tags | `customers(query, first)` |
| `queryInventory` | Stock levels by product/variant/location | `inventoryItems` + `inventoryLevels` |

**Note on analytics**: Rather than using `shopifyqlQuery` (which requires `read_reports` scope and protected customer data configuration), the `queryOrders` tool handles analytics by fetching orders and aggregating server-side. For "sales by day," the tool queries orders for a date range and groups by `createdAt`. For "top products," it aggregates line item revenue. This is simpler, avoids scope/permission dependencies, and is more reliable on dev stores.

### 6b. Write Tools (all preview-first)

Every write tool follows the pattern: **generate draft → return preview to UI → user clicks "Confirm" → execute mutation**. The tool's initial call returns the preview data. A separate confirmation action (triggered by button click in the generative UI component) executes the actual Shopify/Klaviyo mutation.

| Tool Name | Purpose | Preview Shows | On Confirm |
|-----------|---------|---------------|------------|
| `generateLiquidPage` | Create a Shopify page with AI-generated HTML using real product data | Rendered HTML in styled iframe | `pageCreate` → `pageUpdate(isPublished: true)` |
| `createDiscountCode` | Create a percentage or fixed-amount discount code | Code, amount, applicable products, expiry | `discountCodeBasicCreate` mutation |
| `updateProductCopy` | Rewrite product title or description | Before/after text diff | `productUpdate` mutation |
| `createKlaviyoSegment` | Create a customer segment in Klaviyo (stretch) | Segment criteria, estimated size | Klaviyo `POST /api/segments` |
| `sendKlaviyoCampaign` | Create email campaign to a segment (stretch) | Subject line, body preview, segment size | Klaviyo `POST /api/campaigns` |

### 6c. System Prompt Requirements
- Role: Shopify store analyst and operations assistant
- Always query data before answering — never hallucinate store metrics
- Chain multiple tools when needed (e.g., query products → then query orders for those products)
- **Proactively suggest actions** after surfacing insights: "Want me to draft a landing page?" / "I can set up a discount code — I'll show you a preview first"
- Present data visually whenever possible (trigger generative UI via tool calls)
- When generating pages, use real product data (title, price, image URLs) from prior tool calls
- When doing customer analysis, calculate RFM-style metrics (recency, frequency, monetary) from order data and frame them as "predicted lifetime value" indicators
- **Always frame write actions as drafts**: "Here's what the page would look like" / "Here's the discount code I'd create — want me to go ahead?"

---

## 7. Test Store Seed Data

### 7a. Why Custom Seed Data
Shopify's auto-generated test data is random and won't tell the specific stories our demo requires. We seed curated data via GraphQL mutations so the demo narrative works identically every time.

### 7b. Seed Script
- File: `scripts/seed-store.ts`
- Authenticates via custom app token (Settings → Apps → Develop apps → install → get access token) or via the app's session during `shopify app dev`
- **Idempotent**: checks for existing data before creating; safe to re-run

### 7c. Rate Limits & Volume Strategy
Shopify dev stores enforce order creation rate limits (~5 `orderCreate` mutations per minute). This constrains our seed volume. Strategy:

- **Products**: 10 products — no rate limit concern, these create in seconds
- **Customers**: 150 customers — use `customerCreate` mutation, batch in groups of 10
- **Orders**: 200-250 orders — use `draftOrderCreate` → `draftOrderComplete` (different rate limit path than `orderCreate`; test in Phase 1 to confirm). Even at conservative rates, 250 draft orders should complete in 15-25 minutes. If `draftOrder` path is also heavily limited, reduce to 100-150 orders and adjust the demo narrative — the patterns still hold at lower volume, the absolute numbers are just smaller.

The demo narrative doesn't depend on exact numbers ("2,847 revenue this week"). It depends on **relative patterns**: Collagen has higher margin than Greens, Protein Bars and Electrolyte Mix co-occur, Vitamin D is selling fast with low stock. These patterns are visible at 200 orders just as clearly as at 2,500.

### 7d. Products (10 products, 2-3 variants each)

All products are in a health/nutrition DTC brand (think: supplement company).

| Product | Price | Cost (unitCost) | Margin | Inventory | Role in Demo |
|---------|-------|-------------------|--------|-----------|--------------|
| **Collagen Peptides** | $39.99 | $8.00 | ~80% | 120 | THE hidden gem. High margin, high reorder rate, but only ~#7 by volume. |
| **Daily Greens Powder** | $34.99 | $15.00 | ~57% | 200 | Top seller by volume. Lower margin. The "obvious" product. |
| **Protein Bars** (variety pack) | $29.99 | $12.00 | ~60% | 90 | Frequently bought WITH Electrolyte Mix (~40% co-occurrence). Two SEPARATE products — the insight is they SHOULD be bundled. |
| **Electrolyte Mix** | $24.99 | $8.00 | ~68% | 85 | The other half of the undiscovered bundle pair. |
| **Vitamin D Drops** | $19.99 | $4.00 | ~80% | **15** | Low stock alert. Recent sales spike. ~10 days of inventory at current velocity. |
| Omega-3 Fish Oil | $24.99 | $9.00 | ~64% | 150 | Filler — steady mid-range |
| Probiotic Capsules | $29.99 | $10.00 | ~67% | 110 | Filler — steady |
| Magnesium Complex | $19.99 | $6.00 | ~70% | 180 | Filler — lower volume |
| Turmeric Curcumin | $27.99 | $8.00 | ~71% | 95 | Filler — moderate |
| Pre-Workout Blend | $32.99 | $11.00 | ~67% | 70 | Filler — moderate |

Each product has:
- 2-3 variants (e.g., 30-day / 60-day / 90-day supply)
- Real product descriptions (generate with Claude during seed script)
- `inventoryItem.unitCost` set on each variant via `inventoryItemUpdate` mutation (Shopify's native cost field — no custom metafield needed)
- Product images (free stock from Shopify Burst or Unsplash; upload via `productCreateMedia` or set image URLs)

### 7e. Customers (150 customers)

| Segment | Count | Behavior | Role in Demo |
|---------|-------|----------|--------------|
| Collagen loyalists | 10-15 | 2-3 orders each containing Collagen Peptides. High LTV. | Proves reorder rate insight |
| High-value omnivores | 15-20 | 3+ orders, broad product mix, $200+ total spend | High-LTV segment |
| Bundle pair buyers | 20-25 | Orders containing both Protein Bars AND Electrolyte Mix | Proves co-purchase pattern |
| One-time buyers | 50-60 | Single order, various products | Realistic base |
| Lapsed customers | 25-30 | Last order 45+ days ago | Win-back email target |
| Recent new customers | 20-25 | First order in last 14 days | Growing base signal |

All customers get: realistic names, US addresses with geographic spread, email addresses (`firstname.lastname@example.com`).

### 7f. Orders (200-250 orders)

**Date distribution**: Spread over the last 45 days. Higher volume in recent 2 weeks (upward trend for sparkline). Test whether draft orders allow backdating in Phase 1 — this is the highest-priority validation task.

**Product distribution patterns**:
- Daily Greens: ~45% of orders (top seller)
- Collagen Peptides: ~15% of orders, concentrated among loyalist customers (repeat purchases)
- Protein Bars: ~20% of orders
- Electrolyte Mix: ~18% of orders, with ~40% overlap with Protein Bars orders
- Vitamin D Drops: ~12% of orders, ~60% of those in last 10 days (velocity spike)
- Remaining products: distributed across other orders

**Order characteristics**:
- Values: $20 - $130, AOV around $55-65
- Fulfillment: 75% fulfilled, 15% partially fulfilled, 10% unfulfilled
- 1-4 line items per order

### 7g. Collections
- "Bestsellers" — Daily Greens, Collagen Peptides, Protein Bars, Vitamin D Drops
- "Daily Essentials" — Vitamin D, Omega-3, Probiotic, Magnesium
- "Performance" — Pre-Workout, Electrolyte Mix, Protein Bars

### 7h. What NOT to Pre-Create
- **No discount codes** — agent drafts these live
- **No pages** — agent generates these live
- **No Klaviyo segments or campaigns** — agent creates these live

---

## 8. The Demo Narrative

This is the scripted flow for the Loom video. Every product name and insight comes from real API calls against seeded data.

### Act 1: Dashboard on Load
App opens → KPI cards render automatically. 30-day sales chart shows slight upward trend. Chat welcomes the CEO. **Value before a single keystroke.**

### Act 2: Data Exploration
- *"How did we do this month compared to last month?"*
  → Agent queries orders for both periods, aggregates server-side → comparison chart renders
- *"Which products are driving the most revenue?"*
  → Agent queries products + orders → ranked product grid
  → Daily Greens is #1. Collagen Peptides is #7 by volume.

### Act 3: The Insight
- *"Are there any products I should be pushing harder?"*
  → Agent analyzes margin (from `inventoryItem.unitCost`), reorder rate (from repeat customer orders), and volume
  → "Your Collagen Peptides has an 80% margin and customers who buy it reorder at 2.5x the rate of your top seller. It's #7 by volume but #2 by margin contribution. This is an undermarketed product."
  → Renders comparison card: Collagen vs Daily Greens side-by-side
  → "Want me to draft a landing page to push this product, or set up a discount code to drive trial? I'll show you a preview before anything goes live."

### Act 4: Landing Page (preview-first)
- *"Build me a landing page for the Collagen Peptides"*
  → Agent pulls real product data (title, price, description, image URLs) from prior tool call
  → Calls `generateLiquidPage` → Claude generates HTML with real product info embedded
  → `LiquidPreview` component renders with live preview
  → **"Here's a draft. Want me to publish it?"**
  → CEO clicks "Publish" → page goes live

### Act 5: Discount Code (preview-first)
- *"Create a 15% off code for first-time collagen buyers"*
  → Agent drafts: code "COLLAGEN15", 15% off, applicable to Collagen Peptides
  → `DiscountCard` renders: code, terms, copy button, **"Confirm" button**
  → CEO confirms → code is created
  → "Done. Want me to add this code to the landing page?"

### Act 6: Email Campaign — Klaviyo (stretch, preview-first)
- *"Email our best customers who haven't tried Collagen yet, with this discount and a link to the landing page"*
  → Agent queries customers, calculates RFM-style value from order data, identifies segment
  → Calls `createKlaviyoSegment` → preview shows segment criteria and size
  → Calls `sendKlaviyoCampaign` → preview shows subject line, body, segment
  → `EmailCampaignCard` renders with **"Send Campaign" button**
  → "I've identified 12 high-value customers who regularly buy supplements but haven't tried Collagen Peptides. Here's the campaign — ready to send?"

### Why This Narrative Works
- **Five actions from one conversation**: query → insight → page → discount → email campaign
- **Every mutation is preview-first**: the agent proposes, the human approves. Trust layer is visible.
- **Agent is proactive**: suggests actions, doesn't just answer questions
- **Complete marketing execution loop**: insight → landing page → promo code → targeted email. What takes a team a week, done in 5 minutes.
- **Scriptable**: seeded data guarantees this flow works every time

---

## 9. Generative UI Components

### 9a. Pattern (AI SDK 5.0)
When Claude calls a tool, the response includes typed parts like `tool-queryProducts`. The frontend switches on `part.type` to render custom React components:

```
message.parts.map(part => {
  switch(part.type) {
    case 'text':                       → <Markdown />
    case 'tool-queryProducts':         → <ProductGrid />
    case 'tool-queryOrders':           → <OrdersTable />
    case 'tool-getStoreSummary':       → <KPIDashboard />
    case 'tool-queryCustomers':        → <CustomerCard />
    case 'tool-queryInventory':        → <InventoryStatus />
    case 'tool-generateLiquidPage':    → <LiquidPreview />
    case 'tool-createDiscountCode':    → <DiscountCard />
    case 'tool-updateProductCopy':     → <ProductUpdateConfirm />
    case 'tool-createKlaviyoSegment':  → <EmailCampaignCard />
    case 'tool-sendKlaviyoCampaign':   → <EmailCampaignCard />
  }
})
```

### 9b. Component Specs

| Component | Trigger | Content | Interactive Elements |
|-----------|---------|---------|---------------------|
| `KPIDashboard` | `getStoreSummary` | 3-4 metric cards: revenue, orders, AOV, alerts | "Dig deeper" prompt buttons |
| `ProductGrid` | `queryProducts` | Cards: image, title, price, inventory, margin badge | Click → Shopify admin via App Bridge |
| `OrdersTable` | `queryOrders` | Sortable table: order #, date, customer, total, status | Click → order detail in admin |
| `SalesChart` | `queryOrders` (aggregated) | Recharts bar/line: revenue over time, by product | Hover tooltips with values |
| `CustomerCard` | `queryCustomers` | Name, email, orders, LTV, last order, value indicator | Click → customer in admin |
| `InventoryStatus` | `queryInventory` | Color-coded bars: green >50, yellow 10-50, red <10 | "Show low stock only" filter |
| `LiquidPreview` | `generateLiquidPage` | Styled iframe with generated HTML | **"Publish" confirm button** |
| `DiscountCard` | `createDiscountCode` | Code, %, products, expiry | **"Confirm" button**, copy-to-clipboard |
| `ProductUpdateConfirm` | `updateProductCopy` | Before/after text diff | **"Confirm Update" button** |
| `ComparisonCard` | Agent-composed | Side-by-side: margin, velocity, reorder, LTV | "Draft a page for this" prompt |
| `EmailCampaignCard` | Klaviyo tools | Segment size, criteria, subject, body preview | **"Send Campaign" confirm button** |

**Key pattern**: Every component with a mutation has an explicit confirm button. The agent drafts, the user approves.

---

## 10. Stretch Goal: Liquid Page Generation

### Flow
1. User asks "build me a landing page for [product]"
2. Agent calls `queryProducts` to get real data (title, description, price, image URLs from Shopify CDN)
3. Agent calls `generateLiquidPage` — Claude generates HTML with real product data embedded
4. Tool returns preview HTML + does NOT create the page yet
5. Frontend renders `LiquidPreview`: styled iframe with preview + "Publish" button
6. On confirm: `pageCreate` mutation creates the page, `pageUpdate` publishes it

### Key Mutations
```graphql
mutation pageCreate($page: PageCreateInput!) {
  pageCreate(page: $page) {
    page { id title handle body }
    userErrors { field message }
  }
}

mutation pageUpdate($id: ID!, $page: PageUpdateInput!) {
  pageUpdate(id: $id, page: $page) {
    page { id isPublished }
    userErrors { field message }
  }
}
```

---

## 11. Stretch Goal: Klaviyo Email Campaigns

**Priority: Do this only after the core app (Phases 1-4) is solid.** This is the "one more thing" that nobody else's take-home will have, but only if the foundation is rock solid first.

### Setup
- Free Klaviyo account (up to 250 contacts), marked as test account
- Connect to Shopify dev store via Klaviyo's native integration (syncs customers + orders)
- API private key in `.env` as `KLAVIYO_API_KEY`
- Note: only 150 customers in our seed, well within 250-contact free tier

### Tools
**`createKlaviyoSegment`**: Creates a segment based on criteria the agent determines from conversation context. Uses Klaviyo's segment conditions API. Returns preview (criteria, estimated size) for user confirmation.

**`sendKlaviyoCampaign`**: Creates a campaign targeting a segment. Agent composes subject line and body (can reference discount codes and landing page URLs from earlier in conversation). Returns preview for confirmation. Note: on free/test accounts, emails may only send to verified addresses. For Loom, showing the campaign preview with "Send" button is sufficient — actual delivery is not the point.

### Why This Matters
Completes the marketing execution loop. Also checks the "additional data sources" item from the assignment brief. The agent orchestrates across Shopify + Klaviyo in one conversation — that's the AI-first agency thesis in action.

### LOE: ~half day

---

## 12. Time Permitting: Document Parsing

**Do this last. Only if Phases 1-5 are done and polished.** It does not connect to the core demo narrative (data → insight → page → discount → email). It's a nice standalone capability but adds nothing to the story arc. If built, don't put it in the Loom unless you have time to spare.

### Implementation
- Add file upload to chat input (drag-and-drop or button)
- `npm install pdf-parse papaparse`
- Server action: PDFs → `pdf-parse`, CSVs → `papaparse`, images → Claude vision (base64)
- Add `parseDocument` tool — extracted text injected into conversation context
- Agent can answer questions about uploaded documents and cross-reference with Shopify data

### Possible demo moment
Upload brand guidelines PDF → agent summarizes → "want me to redo the landing page using your brand voice?" This is cool but only if the landing page generation is already flawless.

### LOE: ~2-3 hours

---

## 13. Key GraphQL Queries

### Products
```graphql
query GetProducts($query: String, $first: Int!) {
  products(query: $query, first: $first) {
    edges {
      node {
        id title handle status productType vendor totalInventory
        priceRangeV2 {
          minVariantPrice { amount currencyCode }
          maxVariantPrice { amount currencyCode }
        }
        featuredMedia { preview { image { url altText } } }
        variants(first: 10) {
          edges { node { id title sku price inventoryQuantity
            inventoryItem { unitCost { amount currencyCode } }
          } }
        }
      }
    }
  }
}
```

### Orders
```graphql
query GetOrders($query: String, $first: Int!) {
  orders(query: $query, first: $first) {
    edges {
      node {
        id name createdAt
        displayFinancialStatus displayFulfillmentStatus
        totalPriceSet { shopMoney { amount currencyCode } }
        subtotalPriceSet { shopMoney { amount currencyCode } }
        customer { id displayName email }
        lineItems(first: 10) {
          edges { node { name quantity sku originalUnitPriceSet { shopMoney { amount } } } }
        }
        shippingAddress { city provinceCode country }
      }
    }
  }
}
```

### Customers
```graphql
query GetCustomers($query: String, $first: Int!) {
  customers(query: $query, first: $first) {
    edges {
      node {
        id displayName email phone numberOfOrders
        amountSpent { amount currencyCode }
        createdAt
        defaultAddress { city provinceCode country }
        tags
      }
    }
  }
}
```

### Discount Code Creation
```graphql
mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
  discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
    codeDiscountNode {
      id
      codeDiscount {
        ... on DiscountCodeBasic {
          codes(first: 1) { nodes { code } }
        }
      }
    }
    userErrors { field message }
  }
}
```

---

## 14. Project Structure

```
growth-capital-shopify-ai/
├── app/
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── tools.ts              # All tool definitions (read + write)
│   │   │   ├── system-prompt.ts      # System prompt builder
│   │   │   └── shopify-queries.ts    # GraphQL query/mutation strings
│   │   ├── klaviyo/
│   │   │   └── client.ts            # Klaviyo API wrapper (stretch)
│   │   └── shopify.server.ts         # Shopify app config (from template)
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatInterface.tsx     # Main chat UI with useChat
│   │   │   ├── MessageRenderer.tsx   # part.type → generative UI component
│   │   │   └── ChatInput.tsx         # Text input
│   │   └── generative-ui/
│   │       ├── KPIDashboard.tsx
│   │       ├── ProductGrid.tsx
│   │       ├── OrdersTable.tsx
│   │       ├── SalesChart.tsx
│   │       ├── CustomerCard.tsx
│   │       ├── InventoryStatus.tsx
│   │       ├── LiquidPreview.tsx
│   │       ├── DiscountCard.tsx
│   │       ├── ProductUpdateConfirm.tsx
│   │       ├── ComparisonCard.tsx
│   │       └── EmailCampaignCard.tsx  # Stretch
│   ├── routes/
│   │   ├── app.tsx                   # App layout (Polaris + App Bridge)
│   │   ├── app._index.tsx            # Home: auto-loaded dashboard + chat
│   │   └── api.chat.ts              # AI chat API endpoint (server-side)
│   └── root.tsx
├── scripts/
│   └── seed-store.ts                 # Curated data seeding script
├── prisma/
│   └── schema.prisma                 # Session storage only
├── public/
├── shopify.app.toml                  # App config with scopes
├── Dockerfile                        # From template, for Cloud Run
├── .env.example
├── package.json
└── README.md
```

---

## 15. Build Sequence

### Phase 1: Foundation (Day 1)
1. Create Shopify Partner account + empty dev store
2. Scaffold app with React Router template
3. Configure scopes in `shopify.app.toml`
4. `shopify app dev` → verify app installs and loads in admin
5. Install AI SDK + other dependencies
6. **Build + run `scripts/seed-store.ts`** — start with products + a handful of orders. **Test whether draft orders allow backdating `created_at`**. This is the highest-priority validation. If they don't backdate, determine the workaround (see Section 18). Then seed remaining customers and orders.
7. Create `/api/chat` route: `streamText()` with Claude + `getStoreSummary` tool only
8. Create basic chat UI with `useChat` → verify end-to-end streaming works

### Phase 2: Home Screen + Read Tools (Day 2)
9. Build the auto-loading home screen (KPI cards + sparkline from loader)
10. Build all read tools: `queryProducts`, `queryOrders` (with server-side aggregation for analytics), `queryCustomers`, `queryInventory`
11. Write the system prompt (proactive suggestions, never hallucinate, chain tools, frame writes as drafts)
12. Test multi-turn conversations: "How did we do?" → "Which products?" → "Tell me more about that one"

### Phase 3: Generative UI (Day 2-3)
13. Build generative UI components (prioritize: KPIDashboard, ProductGrid, OrdersTable, SalesChart, ComparisonCard)
14. Wire tool parts → components in `MessageRenderer.tsx`
15. Add Recharts for charts
16. Add interactive elements (App Bridge navigation, confirm buttons, copy buttons, "dig deeper" prompts)
17. Build remaining components (CustomerCard, InventoryStatus)

### Phase 4: Write Tools + Core Demo (Day 3-4)
18. `generateLiquidPage` tool + `LiquidPreview` with preview → confirm → publish flow
19. `createDiscountCode` tool + `DiscountCard` with preview → confirm flow
20. `updateProductCopy` tool + `ProductUpdateConfirm` with before/after diff → confirm flow
21. **Test the full scripted demo (Acts 1-5) end-to-end**

### Phase 5: Klaviyo Stretch (Day 4-5, only if Phases 1-4 are solid)
22. Set up Klaviyo test account, connect to Shopify dev store, verify customer sync
23. Build `createKlaviyoSegment` tool with preview
24. Build `sendKlaviyoCampaign` tool with preview
25. Build `EmailCampaignCard` component with confirm
26. Test full demo flow including Act 6

### Phase 6: Polish & Ship (Day 5)
27. Error handling and loading states throughout
28. System prompt iteration (natural flow, proactive suggestions, draft framing)
29. README: 5-minute setup instructions, architecture diagram, design decisions, tradeoffs, "what I'd build next"
30. (Optional) Deploy to Cloud Run
31. Record Loom following scripted narrative
32. Push to GitHub, verify clean clone + setup works

---

## 16. Deployment

### Local (for Loom recording)
```bash
shopify app dev
```
Best demo experience. No latency. Hot reload.

### Production (GCP Cloud Run)
Template includes Dockerfile:
1. `docker build -t gc-shopify-ai .`
2. `docker push gcr.io/YOUR_PROJECT/gc-shopify-ai`
3. `gcloud run deploy gc-shopify-ai --image gcr.io/YOUR_PROJECT/gc-shopify-ai --allow-unauthenticated`
4. Set Cloud Run URL as App URL in Partner Dashboard
5. Set env vars in Cloud Run: `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `ANTHROPIC_API_KEY`, `KLAVIYO_API_KEY`

### Evaluator Access
Embedded Shopify apps only work inside a Shopify admin iframe. There's no standalone URL. The Loom IS the live demo. README includes "run it yourself in 5 minutes" instructions.

---

## 17. Loom Video Script (8-12 minutes)

1. **Intro** (30s) — "AI as the interface to your Shopify store. Not a feature bolted onto a dashboard — the AI IS the dashboard."

2. **Architecture** (2min) — Diagram. React Router v7, GraphQL, AI SDK 5.0, Claude. Full-stack single unit. Preview-first mutation pattern. "Every write action is a draft until the user approves it."

3. **App opens** (1min) — KPI cards + chart load automatically. "Value before a single keystroke."

4. **Data exploration** (2min) — "How did we do this month vs last?" → chart. "Top products by revenue?" → product grid.

5. **The insight** (2min) — "Products I should push harder?" → Collagen Peptides insight → comparison card. Agent suggests actions proactively.

6. **Landing page + discount** (2min) — "Draft a page for Collagen" → preview → confirm → published. "Set up a 15% off code" → preview → confirm → created.

7. **Email campaign (if built)** (1.5min) — "Email high-value customers who haven't tried Collagen" → segment preview → campaign preview → confirm.

8. **Design decisions** (1min) — Preview-first mutations as a product principle. Server-side aggregation over ShopifyQL (and why). What production looks like: Postgres, caching, multi-tenant, additional channels. "Take-home quality, production architecture."

---

## 18. Technical Notes & Gotchas

### ShopifyQL Decision
We deliberately avoid `shopifyqlQuery`. It requires the `read_reports` scope, which in turn requires Level 2 protected customer data access (name, email, address, phone). On dev stores, this can be configured in Partner Dashboard without full review, but it's unnecessary friction and a dependency we don't need. Instead, the `queryOrders` tool fetches orders for a date range and aggregates revenue/counts/trends server-side in the tool's `execute` function. This is simpler, more reliable on dev stores, and avoids scope creep.

### Order Date Backdating
**Highest-risk unknown. Validate in Phase 1, Step 6.**
Draft orders completed via API may set `created_at` to the completion timestamp, not a backdated value. If backdating isn't possible:
- **Option A**: Run the seed script over 2-3 actual days early in the project, creating ~80 orders/day
- **Option B**: Use `orderCreate` mutation and test if `processedAt` or `createdAt` can be set
- **Option C**: Accept compressed dates and adjust demo to focus on product-level insights (margin, reorder rate, co-purchase patterns) rather than time-series trends. The sparkline chart on the home screen could show "orders by product" instead of "sales over time"
- Test all options early. Do not discover this on Day 4.

### Rate Limits
- Shopify GraphQL: 1000-point cost bucket, restores 50/sec. Seed script must check `extensions.cost` and throttle.
- Dev store `orderCreate`: ~5/min. Draft order path may have different limits. Test.
- Klaviyo API: 75 requests/sec for most endpoints. Not a concern for our volume.

### Polaris Web Components
React Router template uses Polaris web components, not Polaris React. Import patterns differ from older tutorials/examples. Docs: [polaris.shopify.com](https://polaris.shopify.com).

### AI SDK 5.0 Patterns
v5 uses `sendMessage` + manual `useState` for input. Old examples with `handleSubmit`/`input` are v4. Tool parts use typed `tool-${toolName}` naming. Docs: [ai-sdk.dev/docs](https://ai-sdk.dev/docs).

### Embedded App Constraints
App runs in iframe. All navigation via App Bridge. No native `<a>` tags. Use router `Link` component.

### Margin Calculation
Shopify has a native cost field on variants at `inventoryItem.unitCost`. Set it during seeding via `inventoryItemUpdate` mutation, read it in the products query via `variants → inventoryItem { unitCost { amount currencyCode } }`. No custom metafields needed. The system prompt tells the agent to compare `unitCost` against `price` to compute margin.

### Landing Page Images
Product image URLs from Shopify CDN are publicly accessible — safe to embed in generated pages.

### Generated Pages Are Standalone Routes
`pageCreate` creates pages at `/pages/your-handle`, not theme sections. The generated HTML renders inside the store's theme layout, but the body is the HTML blob Claude generates. It won't look like output from a Shopify theme page builder — it's closer to a custom HTML page. This is fine for the demo, but worth acknowledging in the Loom: "In production, you'd integrate with theme sections for full design control."

### Product Search Syntax
`products(query:)` uses Shopify's specific search syntax (e.g., `title:collagen`, `status:active`, `product_type:supplement`), NOT free-text natural language. The `queryProducts` tool has two options: (a) translate the user's natural language into Shopify query syntax in the tool's input schema (harder, fragile), or (b) fetch broadly and filter/rank server-side (simpler, more reliable). **Recommend option (b)** — fetch a generous set and let the tool's server-side logic handle filtering. The LLM decides what to search for via the tool's input params, but the actual Shopify query stays simple.

### Klaviyo Contact Limit
Free tier = 250 contacts. Our 150-customer seed fits. If Klaviyo's Shopify sync pulls additional data, monitor the count.

### Klaviyo Email Sending
On free/test accounts, emails may only deliver to verified addresses. For the Loom, showing the campaign preview with the "Send" button is sufficient. The impressive part is the orchestration (Shopify data → segment → campaign), not actual email delivery.

---

## 19. Environment Variables

```bash
# .env.example
SHOPIFY_API_KEY=                    # Partner Dashboard → App → API credentials
SHOPIFY_API_SECRET=                 # Partner Dashboard → App → API credentials
SCOPES=read_products,write_products,read_orders,read_customers,read_inventory,read_content,write_content,read_themes,write_themes,read_discounts,write_discounts
ANTHROPIC_API_KEY=                  # console.anthropic.com
KLAVIYO_API_KEY=                    # Klaviyo → Settings → API keys → Private key (stretch goal only)
```
