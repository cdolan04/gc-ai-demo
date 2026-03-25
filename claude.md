# CLAUDE.md — Project Context for Claude Code

## What This Is
ShopOS is a Shopify embedded app that gives store owners an AI-powered conversational workspace. The AI agent queries live Shopify data via GraphQL, renders results as generative UI components, and executes marketing actions (landing pages, discount codes, email campaigns) with a preview-first confirmation pattern.

## Tech Stack
- **Framework**: React Router v7 (official Shopify app template, replaces Remix)
- **Shopify**: GraphQL Admin API only (REST is deprecated for new apps)
- **AI**: AI SDK 6 + Claude Sonnet 4 via `@ai-sdk/anthropic`
- **UI**: Polaris Web Components (required for Shopify admin iframe)
- **Charts**: Recharts (lazy-loaded)
- **Email**: Klaviyo REST API (JSON:API format, `https://a.klaviyo.com/api/`)
- **DB**: Prisma + SQLite (session storage only)

## Architecture Rules

### Full-stack single process
React Router v7 handles both frontend and server routes. No separate backend. Server routes (`app/routes/api.*.ts`) handle Shopify auth, GraphQL calls, AI streaming, and Klaviyo API calls.

### Generative UI pattern
When the AI calls a tool, the frontend renders a **typed React component**, not text. The mapping lives in `MessageRenderer.tsx`:
- `getStoreSummary` → `KPIDashboard` (insight tiles with visual indicators)
- `queryProducts` → `ProductGrid` (cards with images, prices, margin badges)
- `queryOrders` (aggregateBy: "day") → `SalesChart` (Recharts bar chart)
- `queryOrders` (aggregateBy: "product") → `ProductGrid` (ranked table)
- `queryOrders` (none) → `OrdersTable` (sortable table)
- `queryCustomers` → `CustomerCard` (value-tiered customer list)
- `queryInventory` → `InventoryStatus` (depletion bars)
- `compareProducts` → `ComparisonCard` (side-by-side with insight + action buttons)
- `generateLiquidPage` → `LiquidPreview` (iframe preview + publish button)
- `createDiscountCode` → `DiscountCard` (code preview + confirm button)
- `updateProductCopy` → `ProductUpdateConfirm` (before/after diff + confirm)
- `createKlaviyoAudience` → `EmailCampaignCard` (audience preview + confirm)
- `sendKlaviyoCampaign` → `EmailCampaignCard` (email preview + send button)

### Preview-first mutations
ALL write tools return a preview object — never execute mutations directly. The actual Shopify/Klaviyo mutations happen in `api.confirm.ts` when the user clicks a confirm button in the generative UI component. This is a product principle, not a technical detail.

### Workspace layout
The chat takes up the full page height. User messages are compact right-aligned bubbles. Assistant text responses have a max-width for readability. Generative UI components (charts, grids, cards) render full-width — they are sections of the workspace, not chat attachments.

## Key Files
- `app/routes/app._index.tsx` — Home screen with KPI strip (server-side loader) + chat workspace
- `app/routes/api.chat.ts` — AI streaming endpoint, creates tools with authenticated admin client
- `app/routes/api.confirm.ts` — Executes mutations after user confirmation
- `app/lib/ai/tools.ts` — All tool definitions + confirmation executors
- `app/lib/ai/system-prompt.ts` — System prompt (analytical, tool-first, proactive)
- `app/lib/ai/shopify-queries.ts` — GraphQL query/mutation strings
- `app/lib/klaviyo/client.ts` — Klaviyo REST API wrapper
- `app/components/chat/ChatInterface.tsx` — Workspace UI, useChat, ChatActionContext
- `app/components/chat/MessageRenderer.tsx` — Routes tool parts to generative UI components
- `app/components/generative-ui/*.tsx` — All visual components
- `scripts/seed-store.ts` — Seeds dev store with curated demo data

## Conventions

### Styling
All components use inline styles with Polaris CSS variables (e.g., `var(--p-color-text-brand, #008060)`). No CSS modules or Tailwind. This is required for Polaris web component compatibility in the Shopify iframe.

### Tool data flow
1. AI calls tool → tool's `execute()` returns structured data
2. `MessageRenderer` matches `tool-{name}` part type → renders component
3. Component receives tool result as `data` prop
4. For write tools: component has confirm button → calls `/api/confirm` → mutation executes

### Error handling
- GraphQL errors: caught in `gql()` helper in tools.ts, thrown as descriptive errors
- Tool execution errors: caught by AI SDK, surfaced in stream
- Confirm errors: returned as `{ success: false, errors: [...] }`, displayed in component
- Component render errors: caught by `UIErrorBoundary` wrapper

### System prompt principles
- ALWAYS call a tool before responding with data — never hallucinate metrics
- Use the right tool so the UI renders visuals, not text dumps
- Text responses are 2-3 sentence analyst commentary AFTER the tool result
- Proactively suggest next actions with specific phrasing
- Frame all write actions as drafts

## Common Tasks

### Adding a new read tool
1. Add GraphQL query to `shopify-queries.ts`
2. Add tool definition in `tools.ts` with Zod schema
3. Create generative UI component in `components/generative-ui/`
4. Add case to `MessageRenderer.tsx` switch + loading text
5. Add tool→UI mapping note to system prompt

### Adding a new write tool
Same as above, plus:
6. Tool's `execute()` returns `{ status: 'preview', ...data }`
7. Component includes confirm button that POSTs to `/api/confirm`
8. Add case to `api.confirm.ts` switch with the actual mutation
9. Add success/error states to the component

### Modifying the system prompt
Edit `app/lib/ai/system-prompt.ts`. Test changes by running a conversation and checking whether the AI uses tools correctly, renders appropriate components, and follows the preview-first pattern for writes.

## Seed Data Context
The dev store has 10 supplement products, 150 customers, and 200+ orders with specific distribution patterns:
- **Collagen Peptides**: 80% margin, low volume — the "hidden gem" insight
- **Daily Greens Powder**: Top seller, lower margin — the "obvious" product
- **Protein Bars + Electrolyte Mix**: 40% co-purchase rate — bundle opportunity
- **Vitamin D Drops**: Recent velocity spike, low stock — alert trigger
- Customer segments: loyalists, high-value, bundle buyers, one-time, lapsed, recent

These patterns exist so the AI can discover them through live queries. Nothing is hardcoded in the agent's responses.
