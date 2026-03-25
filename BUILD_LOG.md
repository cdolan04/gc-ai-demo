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

---

## Phase 2: Hardening & Gap-Filling

**Date:** 2026-03-24

### What Was Done

Cleanup, hardening, and gap-filling. Made the codebase demo-ready: added the missing ComparisonCard (critical for the Act 3 "hidden gem" demo moment), hardened error handling throughout, expanded the system prompt for the demo narrative, and wrapped generative UI in error boundaries.

### Files Created

| File | Purpose |
|------|---------|
| `app/components/generative-ui/ComparisonCard.tsx` | Side-by-side product comparison (margin, revenue, units sold, reorder rate) with insight text and suggested action — key component for the "hidden gem" demo moment (Act 3) |
| `app/components/generative-ui/ErrorBoundary.tsx` | React error boundary that wraps each tool result render, preventing a single component crash from killing the chat |

### Files Modified

| File | Change |
|------|--------|
| `app/lib/ai/tools.ts` | Added `compareProducts` tool (9th tool); hardened `gql` helper to throw on GraphQL errors/empty data instead of silently returning undefined |
| `app/lib/ai/system-prompt.ts` | Major expansion: added tool-to-UI mapping guide, "hidden gem" analysis pattern, landing page generation guidance, tone section, period comparison instructions |
| `app/routes/api.chat.ts` | Added `ANTHROPIC_API_KEY` presence check, `onError` logging callback |
| `app/routes/api.confirm.ts` | Added try/catch around JSON parse and mutation execution with proper error responses (400/500) |
| `app/components/chat/MessageRenderer.tsx` | Added ComparisonCard + ErrorBoundary imports, wired `compareProducts` tool to ComparisonCard, wrapped all tool renders in UIErrorBoundary |

### Files Deleted

| File | Reason |
|------|--------|
| `app/routes/app.additional.tsx` | Unused template boilerplate; nav link already removed in Phase 1 |

### Deviations from GAMEPLAN

None — this phase was about filling gaps. The ComparisonCard was specified in GAMEPLAN Section 9b but was missing from Phase 1.

### Decisions Made

- **`compareProducts` is a render-only tool**: It doesn't query Shopify — the agent composes comparison data from prior `queryProducts` + `queryOrders` results and passes it to `compareProducts` for rendering. This keeps the tool simple and lets the AI decide what to compare.
- **Error boundaries at the tool-result level**: Each tool render is independently wrapped, so one bad render doesn't collapse the entire message thread.
- **GraphQL errors now throw**: The `gql` helper previously silently returned `undefined` on errors. Now it throws with the Shopify error message, which the AI SDK surfaces back to Claude so it can inform the user.

### Issues Encountered

- **Stale React Router types**: Deleting `app.additional.tsx` left orphaned generated types in `.react-router/types/`. Fixed by running `npx react-router typegen` to regenerate.

### What the Next Phase Needs to Know

- **9 tools total now**: 5 read + 1 comparison + 3 write (preview-first).
- **System prompt is tuned for the demo narrative**: Specifically guides the agent through the Act 3 "hidden gem" pattern (query products for margin → query orders for volume → compareProducts to present the insight → suggest landing page or discount).
- **Still untested against a real store** — needs `shopify app dev` + seed data to validate end-to-end.
- **Klaviyo integration** (Phase 5 stretch) is not started.
- **Build and type-check both pass clean** (excluding Polaris web component types which are harmless).

---

## Phase 3: Polish & Ship Readiness

**Date:** 2026-03-24

### What Was Done

Polish and ship readiness. Code-split the Recharts bundle (530KB → 176KB main chunk), added a low-stock alert banner on the dashboard, installed `tsx` for the seed script with an `npm run seed` convenience command, and wrote a complete README with 5-minute setup instructions.

### Files Created

| File | Purpose |
|------|---------|
| `app/components/generative-ui/SalesChartInner.tsx` | Recharts implementation extracted into its own module for lazy loading |

### Files Modified

| File | Change |
|------|--------|
| `app/components/generative-ui/SalesChart.tsx` | Rewritten as thin wrapper with `lazy()` + `Suspense` — Recharts only loads when a chart renders |
| `app/routes/app._index.tsx` | Added low-stock alert banner (yellow caution box listing items with < 10 inventory) |
| `package.json` | Added `tsx` dev dependency, added `"seed"` npm script (`tsx scripts/seed-store.ts`) |
| `README.md` | Complete rewrite: quick start (5 min), architecture diagram, design decisions, tools table, generative UI component list, tech stack, project structure, production notes |

### Deviations from GAMEPLAN

None.

### Decisions Made

- **Lazy-load Recharts at the component level**: Split into `SalesChart` (thin wrapper with Suspense) and `SalesChartInner` (actual Recharts). Main bundle dropped from 530KB to 176KB. Recharts (359KB) only loads when the AI returns a day-aggregated order chart.
- **No client-side loading skeleton needed for KPIs**: The home screen loader runs server-side, so KPI data is available on first paint — React Router streams the full page with data already populated. Added a "Loading chart..." fallback only for the lazy-loaded Recharts Suspense boundary.
- **`npm run seed` convenience script**: Evaluators can seed with `SHOPIFY_STORE=... SHOPIFY_ACCESS_TOKEN=... npm run seed` instead of remembering the `npx tsx` path.

### Issues Encountered

None.

### What the Next Phase Needs to Know

- **Chunk sizes are healthy**: main bundle 176KB, Recharts lazy chunk 359KB (only loaded on demand).
- **README is evaluator-ready**: 5-minute setup, architecture diagram, design decisions, "what production looks like" section.
- **Remaining stretch goals**: Klaviyo integration (GAMEPLAN Phase 5), document parsing (GAMEPLAN Section 12). Neither is started.
- **Everything still needs real-store testing** (`shopify app dev` + seed data).

---

## Phase 4: V2 — CTO-Level Upgrade

**Date:** 2026-03-25

### What Was Done

Major UX overhaul to transform the app from "chatbot bolted onto a dashboard" into an AI-first interface. Chat is now the full-page experience, auto-fires a weekly briefing on load, renders markdown, and all generative UI components are polished with animations and interactive actions.

### Dependencies Added

| Package | Purpose |
|---------|---------|
| `react-markdown` | Renders markdown in AI text responses (bold, lists, tables, links) |
| `remark-gfm` | GitHub-flavored markdown support (tables, strikethrough) |

### Files Modified

| File | Change |
|------|--------|
| `app/routes/app._index.tsx` | Gutted dashboard (removed KPI cards, sparkline, low-stock banner). Now full-viewport chat with simplified loader providing `welcomeContext` string |
| `app/components/chat/ChatInterface.tsx` | Accepts `welcomeContext` prop; auto-fires "Give me this week's briefing" on mount with `useRef` guard; suggested prompts moved to render after first AI response; auto-retry on initial failure (3s delay); scroll debounced with `requestAnimationFrame`; friendly error messages with Retry button |
| `app/components/chat/MessageRenderer.tsx` | Added `react-markdown` with Polaris-styled component overrides; accepts `onSendPrompt` callback threaded to KPIDashboard and ComparisonCard; fixed tool result state detection (checks for `output` presence instead of `state === "result"` — AI SDK v6 compat) |
| `app/lib/ai/system-prompt.ts` | Added "CRITICAL: Always Use Tools" section; response structure rules (tool first, 1-2 sentences, next action); `welcomeContext` parameter support; `processed_at` guidance for date queries; clarified that confirm buttons handle real Shopify mutations |
| `app/lib/ai/tools.ts` | `getStoreSummary`: fetches prior-period orders for trend comparison, computes revenue trend %, inventory velocity (days left), hidden gem detection; returns `insights` array. `queryOrders`: uses `processedAt` for date aggregation. Both tools use `processed_at` search filters |
| `app/lib/ai/shopify-queries.ts` | Added `processedAt` field to `GET_ORDERS` query |
| `app/routes/api.chat.ts` | Increased `maxRetries` to 5; added `onStepFinish` logging for tool call debugging |
| `app/root.tsx` | Added `fadeSlideIn` CSS keyframe animation |
| `app/components/generative-ui/KPIDashboard.tsx` | Complete redesign: insight-driven briefing cards (color-coded by sentiment: green/amber/blue) with "Dig deeper" buttons; compact metric pills row; accepts `onAction` prop |
| `app/components/generative-ui/ComparisonCard.tsx` | Added "Recommended" badge on winner product; green top border; `suggestedAction` is now a clickable button; margin contribution bars; accepts `onAction` prop |
| `app/components/generative-ui/ProductGrid.tsx` | Aggregated view: rank numbers (#1, #2...), proportional revenue bars; fadeSlideIn animation |
| `app/components/generative-ui/LiquidPreview.tsx` | Added fullscreen toggle, iframe loading state, page URL after publish, **bottom action bar** with Publish button (visible after scrolling through preview) |
| `app/components/generative-ui/DiscountCard.tsx` | "Applies to" moved into green header for prominence; fadeSlideIn animation |
| `app/components/generative-ui/OrdersTable.tsx` | fadeSlideIn animation |
| `app/components/generative-ui/CustomerCard.tsx` | fadeSlideIn animation |
| `app/components/generative-ui/InventoryStatus.tsx` | fadeSlideIn animation |
| `app/components/generative-ui/SalesChartInner.tsx` | fadeSlideIn animation |
| `app/components/generative-ui/ProductUpdateConfirm.tsx` | fadeSlideIn animation |

### Deviations from GAMEPLAN

1. **Removed static dashboard entirely**: GAMEPLAN Section 5 specifies KPI cards + sparkline on the home screen. V2 removes them completely — the auto-fired briefing via `getStoreSummary` replaces them with richer, insight-driven content inside the chat.
2. **`processed_at` vs `created_at`**: Seed script backdates orders using `processedAt`, but all queries were using `createdAt` (which was the actual draft order creation date). Switched all date filtering and aggregation to `processed_at`/`processedAt`.

### Decisions Made

- **Chat-first layout**: Full viewport height, no dashboard chrome. The AI briefing replaces static tiles that duplicate native Shopify analytics.
- **Auto-fire with retry**: Initial briefing fires automatically with one auto-retry on failure (3s delay). Manual retry button as fallback.
- **Tool output detection over state string**: AI SDK v6 tool parts don't reliably set `state === "result"`. Changed to check for `output` presence instead — more robust.
- **Bottom publish button on LiquidPreview**: The preview iframe is tall; users scroll past the header button. Duplicated at the bottom.
- **`maxRetries: 5`**: Anthropic API returns 529 (overloaded) frequently on Sonnet 4. Default 3 retries wasn't enough.

### Issues Encountered

1. **AI SDK v6 tool state mismatch**: Tool parts showed perpetual loading spinners because `state !== "result"` even after completion. Fixed by checking `toolPart.output !== undefined` instead.
2. **`processed_at` vs `created_at`**: All seeded orders appeared on a single day in charts. Root cause: seed script uses `processedAt` for backdating, but queries filtered on `createdAt`.
3. **Anthropic 529 overloaded errors**: Frequent during testing. Mitigated with `maxRetries: 5`, client-side auto-retry, and friendly error message.
4. **AI hallucinating it can't publish**: When user typed "publish" in chat, the AI said it couldn't create pages. Fixed by updating system prompt to explicitly state confirm buttons handle real mutations.
5. **react-markdown bundle size**: Main chunk grew from 176KB to 337KB. Acceptable tradeoff for proper markdown rendering.

### What the Next Phase Needs to Know

- **All 3 write tools are functional**: Landing pages publish via `pageCreate` + `pageUpdate`, discount codes via `discountCodeBasicCreate`, product updates via `productUpdate`. All preview-first with confirm buttons.
- **Bundle sizes**: main 337KB, Recharts lazy 359KB.
- **Tested against real store**: Briefing, charts, product analysis, landing page generation, and date-range queries all work with seeded data.
- **Remaining stretch goals**: Klaviyo integration (GAMEPLAN Phase 5) not started.
- **Product images**: Products now have images attached via Unsplash (run `scripts/add-product-images.ts` to re-attach if needed).

---

## Phase 5: Brand Polish & Visual Quality

**Date:** 2026-03-25

### What Was Done

Visual polish pass to make the demo store look like a real DTC brand. Product images, improved UI components, better landing page generation, rate limit hardening, and discount code bug fix.

### Files Modified

| File | Change |
|------|--------|
| `app/lib/ai/system-prompt.ts` | Expanded landing page generation section with professional DTC structure (hero, social proof, benefits grid, CTA, trust signals) and design rules |
| `app/lib/ai/tools.ts` | Updated `generateLiquidPage` tool description to emphasize professional quality; improved `expiresAt` field guidance; added `endsAt` validation in `confirmCreateDiscount` to reject past dates |
| `app/components/generative-ui/ProductGrid.tsx` | Image container 120px→160px; added first-letter placeholder when no image |
| `app/components/generative-ui/ComparisonCard.tsx` | Image container 80px→120px; added first-letter placeholder when no image |
| `app/routes/api.chat.ts` | Added `trimMessages()` to cap conversation history at 20 messages (prevents rate limit exhaustion); reduced `maxRetries` from 5 to 3 |
| `.gitignore` | Added internal planning docs and temp scripts to ignore list |

### Files Created (NOT committed)

| File | Purpose |
|------|---------|
| `scripts/add-product-images.ts` | Standalone script to attach Unsplash images to existing products via `productCreateMedia`. Idempotent. Run with `npx tsx scripts/add-product-images.ts` |

### Files Removed from Tracking

| File | Reason |
|------|--------|
| `GAMEPLAN.md` | Internal planning doc — not part of deliverable |
| `CLAUDE-CODE-INSTRUCTIONS.md` | Internal AI build instructions — not part of deliverable |
| `CLAUDE-CODE-PHASE3.md` | Internal AI build instructions — not part of deliverable |
| `BUILD_LOG.md` | Internal build log — not part of deliverable |

### Bugs Fixed

1. **Discount code "Ends at needs to be after starts_at"**: AI was generating expiry dates in the past (e.g., Feb 2026 when today is March 2026). Fixed by validating `endsAt > now` in `confirmCreateDiscount` — past dates are silently discarded. Also updated tool schema to guide AI toward future dates.
2. **Rate limit exhaustion (30k tokens/min)**: Long conversations with accumulated tool results were sending 20k+ token requests that, with retries, exceeded the rate limit. Fixed by trimming conversation history to 20 most recent UI messages and reducing `maxRetries` to 3.

### Decisions Made

- **Separate image script, not committed**: Product images are a one-time demo enhancement. Keeping the image script out of the repo avoids cluttering the deliverable with setup-only code.
- **Planning docs removed from git**: GAMEPLAN, BUILD_LOG, and CLAUDE-CODE-* files are internal build artifacts. The evaluator should see a clean repo with just the app code and README.
- **Condensed system prompt**: Landing page instructions were expanded then compressed to balance quality guidance vs token usage.

### What the Next Phase Needs to Know

- **Product images are attached** via Unsplash photos on Shopify CDN. The `featuredMedia.preview.image.url` field is populated for all 10 products.
- **Brand identity not yet applied**: Store name, logo, and theme colors still need manual setup in Shopify admin (Settings → Store details, Settings → Brand, Online Store → Themes → Customize).
- **Rate limit is tight**: 30k input tokens/min on current Anthropic plan. Message trimming helps but very long conversations may still hit it.
- **Remaining stretch goals**: Klaviyo integration (GAMEPLAN Phase 5) not started.

---

## Phase 6: KPI Strip & Chat UX Overhaul

**Date:** 2026-03-25

### What Was Done

Replaced the auto-fire briefing pattern with a persistent KPI strip that renders instantly from loader data. The chat now opens with a welcome message and suggested prompts instead of waiting 3-5s for an AI response. "Dig deeper" buttons on each KPI tile inject prompts into the chat. Store snapshot context is now passed through to the AI system prompt via the transport body.

### Files Created

| File | Purpose |
|------|---------|
| `app/components/chat/KPIStrip.tsx` | Compact horizontal strip with 4 metric tiles (Revenue with WoW delta badge, Orders, AOV, Low Stock), each with a "Dig deeper" button that sends a prompt into the chat |

### Files Modified

| File | Change |
|------|--------|
| `app/routes/app._index.tsx` | Loader: added prior 7-day order query for week-over-week revenue delta; returns structured `kpis` object + `welcomeContext` string. Component: renders KPIStrip above ChatInterface, wired via ref-based callback bridge |
| `app/components/chat/ChatInterface.tsx` | Removed auto-fire briefing and auto-retry useEffects; added `onReady` prop to expose `sendPrompt` to parent; passes `welcomeContext` to API via `DefaultChatTransport` `body` option; empty chat shows welcome message with centered suggested prompts; error retry resends last user message instead of hardcoded briefing |
| `app/routes/api.chat.ts` | Extracts `welcomeContext` from request body and passes it to `buildSystemPrompt()` so AI always has store snapshot context |

### Deviations from GAMEPLAN

1. **No changes to system-prompt.ts**: The `buildSystemPrompt(welcomeContext?)` function already supported the optional parameter — it just wasn't being called with it. Now `api.chat.ts` passes it through.

### Decisions Made

- **`DefaultChatTransport` `body` option for welcomeContext**: The AI SDK's transport `body` option merges extra fields into the JSON request body alongside `messages`. Cleanest approach — no custom headers or hidden messages needed.
- **Ref-based callback bridge**: KPIStrip's "Dig deeper" buttons connect to ChatInterface's `sendPrompt` via a ref stored in the parent component. ChatInterface calls `onReady(sendPrompt)` on mount, parent stores it in a ref, and KPIStrip calls it via the ref. Simple and avoids lifting chat state.
- **Welcome state replaces auto-briefing**: Instead of auto-firing a message and making the user wait, the chat shows a welcome header + suggested prompt buttons immediately. The KPI strip provides instant data visibility.
- **Revenue WoW delta in loader**: Added a second `GET_ORDERS` query for the prior 7-day window (14d ago to 7d ago). Revenue delta displayed as a green/red badge on the revenue tile. Returns `null` if no prior-period data (avoids division by zero).

### Issues Encountered

None.

### What the Next Phase Needs to Know

- **KPI strip renders from server-side loader data** — no AI call needed for initial metrics. The 3 GraphQL queries (current orders, prior orders, products) run in parallel in the loader.
- **welcomeContext now reaches the system prompt**: Every chat request includes the store snapshot in the system prompt's "Current Store Snapshot" section. The AI has context even without calling `getStoreSummary`.
- **Auto-briefing is gone**: The chat starts empty. Users interact via KPI strip "Dig deeper" buttons, suggested prompts, or free-form input.

---

## Phase 7: Klaviyo Integration

**Date:** 2026-03-25

### What Was Done

Added email marketing capabilities via Klaviyo's REST API. The agent can now create targeted customer audiences and send email campaigns — completing the full marketing execution loop: insight → landing page → discount code → email campaign, all in one conversation.

### Files Created

| File | Purpose |
|------|---------|
| `app/lib/klaviyo/client.ts` | Klaviyo REST API wrapper — list CRUD, profile lookup by email, campaign creation, and send. Uses JSON:API format with revision header. |
| `app/components/generative-ui/EmailCampaignCard.tsx` | Dual-mode component: audience preview (list name, customer count, email list) + campaign preview (subject, body in iframe, badges for discount codes and landing pages). Both have confirm buttons. |

### Files Modified

| File | Change |
|------|--------|
| `app/lib/ai/tools.ts` | Added `createKlaviyoAudience` and `sendKlaviyoCampaign` tools (both preview-first). Agent collects customer emails from queryCustomers/queryOrders, then passes them to Klaviyo tools. |
| `app/lib/ai/system-prompt.ts` | Added Klaviyo integration section: explains the two-step flow (audience → campaign), instructs agent to use Shopify data for segmentation logic, reference discount codes and landing pages from earlier in conversation |
| `app/routes/api.confirm.ts` | Added `createKlaviyoAudience` and `sendKlaviyoCampaign` confirmation cases. Audience: creates list, looks up profiles by email, adds to list. Campaign: creates list + campaign, attempts send (graceful failure for free tier). |
| `app/components/chat/MessageRenderer.tsx` | Added EmailCampaignCard import, wired `createKlaviyoAudience` and `sendKlaviyoCampaign` tool parts, added loading text |
| `.env.example` | Added `KLAVIYO_API_KEY` placeholder |

### Decisions Made

- **Lists over segments**: Klaviyo's Segment API has complex condition definitions and a 100 creates/day rate limit. Lists are simpler — create, add profiles, target campaign. The agent does all segmentation logic in its reasoning over Shopify data, then passes emails as the audience definition. This means any audience the user describes in natural language works through the same code path.
- **Agent owns the intelligence, Klaviyo is the delivery channel**: The agent uses queryCustomers + queryOrders to identify the right customers (top spenders, lapsed, product-specific buyers, etc.), then passes their emails to Klaviyo. Klaviyo never needs to understand Shopify's data model.
- **Graceful send failure**: Free Klaviyo accounts can only send to verified email addresses. Campaign send is wrapped in try/catch — failure is logged as a warning, and the UI shows "Queued" instead of "Sent". For a demo, showing the campaign preview with the Send button is the point; actual delivery is secondary.
- **Two-tool flow**: `createKlaviyoAudience` (create list + add profiles) is separated from `sendKlaviyoCampaign` (create campaign + send) so the user can review and confirm each step independently. The agent chains them naturally in conversation.

### Issues Encountered

None — the Klaviyo API is well-documented and the list/campaign/send flow is straightforward.

---

## Phase 8: Type Safety & Polish

**Date:** 2026-03-25

### What Was Done

Eliminated all TypeScript `any` types from the application code (27 occurrences across 9 files → 0). Created shared Shopify GraphQL response type definitions. Updated README to reflect the complete feature set including Klaviyo integration.

### Files Created

| File | Purpose |
|------|---------|
| `app/lib/ai/shopify-types.ts` | Shared TypeScript interfaces for Shopify GraphQL responses: `ShopifyEdge<T>`, `OrderNode`, `ProductNode`, `CustomerNode`, `VariantNode`, `LineItemNode`, `Insight`, `LowStockItem`, `ProductMargin`, etc. |

### Files Modified

| File | Change |
|------|--------|
| `app/lib/ai/tools.ts` | 14 `any` → typed using `ShopifyEdge<>` generics. GraphQL error callback typed as `GraphQLError`. Insights array typed as `Insight[]`. Low stock reduce typed with `LowStockItem`. |
| `app/routes/app._index.tsx` | 4 `any` → typed with `ShopifyEdge<OrderNode>` and `ShopifyEdge<ProductNode>` |
| `app/components/chat/MessageRenderer.tsx` | 3 `any` → local `ToolPart` interface for AI SDK tool parts. Tool result typed as `unknown` with `React.ComponentProps<typeof Component>` assertions at each switch case. `CollapsedOrders` prop typed. |
| `app/routes/api.chat.ts` | 1 `any` → `{ toolName: string }`. HTTP status 500 → 503 for missing API key. |
| `app/routes/api.confirm.ts` | `Record<string, any>` → `Record<string, unknown>`. `catch (error: any)` → `catch (error: unknown)` with `instanceof Error` narrowing. Klaviyo params typed with `as` assertions. |
| `app/components/generative-ui/DiscountCard.tsx` | `catch (e: any)` → `catch (e: unknown)` |
| `app/components/generative-ui/EmailCampaignCard.tsx` | `catch (e: any)` → `catch (e: unknown)` |
| `app/components/generative-ui/LiquidPreview.tsx` | `catch (e: any)` → `catch (e: unknown)` |
| `app/components/generative-ui/ProductUpdateConfirm.tsx` | `catch (e: any)` → `catch (e: unknown)` |
| `README.md` | Complete rewrite with Klaviyo integration, 11 tools, design decisions section, production roadmap |

### Decisions Made

- **Shared types file over inline**: Created `shopify-types.ts` as a single source of truth for GraphQL response shapes rather than defining types inline in each file. These types mirror the actual GraphQL query structures in `shopify-queries.ts`.
- **`unknown` over `any` in catch blocks**: TypeScript best practice. Every catch block now uses `e instanceof Error ? e.message : "Operation failed"` for safe error message extraction.
- **`React.ComponentProps<typeof Component>` for tool result assertions**: Tool outputs from the AI SDK are inherently untyped JSON (`unknown`). Rather than defining duplicate interfaces, the switch statement in MessageRenderer asserts the result type using the actual component's prop types. This keeps types in sync automatically.
- **503 over 500 for missing API key**: HTTP semantics — a missing dependency is a service unavailability, not an internal error.
- **No new dependencies added**: Pure React + inline styles with Polaris CSS custom properties.
