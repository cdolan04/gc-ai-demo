# Build Log

> Living document tracking what was built in each phase, decisions made, and context for what comes next.

---

## Phase 1: Foundation

### What Was Built

End-to-end AI chat infrastructure: a user can open the app in Shopify admin, see auto-loaded KPI cards and a 30-day sparkline, and chat with a Claude-powered agent that can query store data and return generative UI components. All write tools follow the preview-first pattern (draft → preview → user confirms → mutation executes).

### Files Created

| File | Purpose |
|------|---------|
| `app/lib/ai/shopify-queries.ts` | All GraphQL query and mutation strings (products, orders, customers, inventory, pages, discounts, product updates) |
| `app/lib/ai/tools.ts` | 8 AI tools — 5 read (getStoreSummary, queryProducts, queryOrders, queryCustomers, queryInventory) + 3 write with preview-first (generateLiquidPage, createDiscountCode, updateProductCopy) + confirmation executor functions |
| `app/lib/ai/system-prompt.ts` | Agent system prompt: role, rules (never hallucinate, chain tools, preview-first mutations, be proactive), analytics approach, margin calculation, customer analysis |
| `app/routes/api.chat.ts` | SSE streaming chat endpoint — authenticates with Shopify, creates tools with admin client, streams Claude Sonnet 4 responses |
| `app/routes/api.confirm.ts` | Confirmation action endpoint — executes actual Shopify mutations (publishPage, createDiscount, updateProduct) when user clicks confirm buttons |
| `app/components/chat/ChatInterface.tsx` | Full chat UI with `useChat` hook, suggested prompt buttons, loading dots, error display, auto-scroll |
| `app/components/chat/MessageRenderer.tsx` | Routes tool result parts to the correct generative UI component based on tool name |
| `app/components/generative-ui/KPIDashboard.tsx` | KPI metric cards + low stock alerts |
| `app/components/generative-ui/ProductGrid.tsx` | Product cards with image, price, inventory badge, margin badge; also renders aggregated product revenue tables |
| `app/components/generative-ui/OrdersTable.tsx` | Sortable orders table with status badges |
| `app/components/generative-ui/SalesChart.tsx` | Recharts bar chart for revenue-by-day data |
| `app/components/generative-ui/CustomerCard.tsx` | Customer list with spend, order count, and value tier indicator |
| `app/components/generative-ui/InventoryStatus.tsx` | Color-coded inventory bars grouped by product |
| `app/components/generative-ui/LiquidPreview.tsx` | HTML preview in iframe + "Publish" confirm button |
| `app/components/generative-ui/DiscountCard.tsx` | Discount code preview (branded card) + "Confirm & Create" button + copy-to-clipboard |
| `app/components/generative-ui/ProductUpdateConfirm.tsx` | Before/after diff view + "Confirm Update" button |
| `scripts/seed-store.ts` | Idempotent seed script: 10 products with variants/costs/inventory, 157 customers across 6 segments, ~200 orders via draft orders, 3 collections |
| `.env.example` | Placeholder environment variables |

### Files Modified

| File | Change |
|------|--------|
| `app/routes/app._index.tsx` | Replaced template boilerplate with: server-side loader for KPI data + 30-day sparkline, KPI cards, chat panel |
| `app/routes/app.tsx` | Removed "Additional page" nav link, renamed to "Store AI" |
| `app/root.tsx` | Added CSS keyframe animations for loading spinner and pulse dots |

### Deviations from GAMEPLAN

1. **AI SDK version**: GAMEPLAN references AI SDK 5.0, but the scaffold installed AI SDK **v6** (`ai@6.0.138`, `@ai-sdk/react@3.0.140`). This required significant API changes:
   - `tool()` uses `inputSchema: zodSchema(z.object(...))` instead of `parameters: z.object(...)`
   - `useChat` uses `transport: new DefaultChatTransport({ api })` instead of `api` option directly
   - `UIMessage` replaces `Message`; messages use `.parts` array (not `.content` string)
   - `sendMessage()` takes `{ role, parts: [{ type: 'text', text }] }` not `{ role, content }`
   - Tool parts on messages have `type: "tool-${toolName}"` with properties directly on the part (no `.toolInvocation` wrapper); result is in `.output` not `.result`
   - `streamText` uses `stopWhen: stepCountIs(10)` instead of `maxSteps: 10`
   - Response uses `result.toUIMessageStreamResponse()` instead of `toDataStreamResponse()`
   - `convertToModelMessages()` is async (returns Promise)

2. **Phase bundling**: GAMEPLAN separates Phase 1 (foundation + seed) from Phase 2 (home screen + read tools) and Phase 3 (generative UI). I built all three together since they're tightly coupled — you can't verify the chat works without the UI components to render tool results.

3. **Zod version**: Project uses Zod v4 (`zod@4.3.6`), which works with AI SDK v6's `zodSchema()` wrapper but has subtle API differences from Zod v3 examples in most tutorials.

### Decisions Made

- **All generative UI built upfront**: Rather than stubbing components and filling them in later, all 9 generative UI components are complete. This means Phase 3 from the GAMEPLAN is largely done.
- **Inline styles over CSS modules**: Components use inline styles with Polaris CSS custom properties for consistency with the Shopify admin theme. No additional CSS files needed.
- **Confirmation via separate route**: Write tool confirmations go through `/api/confirm` (a dedicated server route) rather than being embedded in the chat stream. This keeps the chat endpoint stateless and makes confirmation a simple POST with the action payload.
- **Seed script uses custom app token**: Rather than trying to authenticate through the app's OAuth session, the seed script uses a direct admin API access token (from Settings → Apps → Develop apps). This is simpler and doesn't require the app to be running.
- **SVG sparkline over Recharts for dashboard**: The home screen 30-day sparkline uses a lightweight inline SVG polyline rather than pulling in Recharts. Keeps the initial bundle smaller; Recharts is only loaded when the chat renders a SalesChart.

### Issues Encountered

1. **AI SDK v6 API mismatch**: The GAMEPLAN was written for AI SDK 5.0, but the latest `ai` package is v6 with breaking changes. Resolved by reading the actual TypeScript declarations in `node_modules` and adapting all code. This was the main time sink.
2. **`convertToModelMessages` is async**: Not obvious from the function name. Caught by TypeScript — needed `await` in the chat route.
3. **Polaris web component TS errors**: `s-page`, `s-section`, etc. are custom elements not in React's JSX type definitions. These are harmless — the components render correctly. Shopify's `@shopify/polaris-types` package provides some types but doesn't cover all elements.
4. **Build chunk size warning**: `app._index` chunk is ~530KB (Recharts is the main contributor). Not a blocker for demo — could be addressed with dynamic imports in Phase 6 polish.

### What the Next Phase Needs to Know

- **The app builds and type-checks** (excluding Polaris web component types and the seed script which runs via `tsx`).
- **All 8 tools are wired up** but haven't been tested against a real Shopify store yet. The seed script also hasn't been run.
- **To test**: Set `ANTHROPIC_API_KEY` in `.env`, run `shopify app dev`, seed the store with `SHOPIFY_STORE=gc-ai-demo.myshopify.com SHOPIFY_ACCESS_TOKEN=<token> npx tsx scripts/seed-store.ts`.
- **The `app/routes/app.additional.tsx` file** still exists from the template but is no longer linked in the nav. Can be deleted in a cleanup pass.
- **Klaviyo integration** (Phase 5 stretch) is not started — no files created for it yet.
- **No error boundaries** on the chat or generative UI components yet — that's Phase 6 polish.
