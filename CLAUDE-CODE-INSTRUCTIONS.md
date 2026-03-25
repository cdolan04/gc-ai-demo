# Claude Code: Shopify AI Agent — V2 Upgrade Plan

> **Context**: This is a take-home project for a CTO role at Growth Capital. We have a working v1 Shopify embedded app with an AI chat agent. The app "works" but doesn't feel CTO-level. This document contains prioritized instructions to fix that.
> 
> **Constraint**: This runs inside a Shopify admin iframe using Polaris web components (`<s-page>`, `<s-section>`, etc). We cannot use custom fonts or wild layouts — but we CAN make the content and interactions dramatically better within that constraint. The "design quality" here is about information design, interaction quality, and the feeling that the AI is genuinely useful — not about visual pizzazz.
>
> **Key files**: All source lives in `app/`. Key files: `routes/app._index.tsx` (home screen), `routes/api.chat.ts` (AI endpoint), `lib/ai/tools.ts` (tool definitions), `lib/ai/system-prompt.ts`, `components/chat/ChatInterface.tsx`, `components/chat/MessageRenderer.tsx`, `components/generative-ui/*.tsx`.

---

## TASK 1: Flip the layout — chat IS the interface (HIGHEST PRIORITY)

### Problem
The current layout puts 4 generic KPI cards + an empty sparkline chart on top, then crams the chat into a 500-700px box at the bottom. This screams "chatbot bolted onto a dashboard." The GAMEPLAN explicitly says: "The AI IS the interface. Not a chat bolted onto a dashboard."

Worse, the KPI tiles (orders count, revenue, AOV, low stock count) are **literally available natively in Shopify's admin home**. A CTO evaluator will look at those tiles and think: "Why would I use this instead of just looking at my Shopify dashboard?"

### What to build
Restructure `app/routes/app._index.tsx` so the chat is the primary, full-height experience:

1. **Remove the static KPI cards and sparkline entirely.** They add no value over native Shopify.

2. **Make the chat panel the full page.** It should fill the available viewport height (use `calc(100vh - [header height])` or flexbox). No more `minHeight: 500px / maxHeight: 700px` — it should breathe.

3. **Replace the welcome message with an auto-fired insight summary.** Instead of a static text paragraph + prompt buttons, the app should automatically send an initial message on first load that triggers the agent to provide a smart welcome. Two approaches (pick the simpler one):
   - **Option A (recommended)**: Keep the current loader data but instead of rendering it as static tiles, pass it as context to the chat's system prompt. Add a `welcomeContext` field to the system prompt that includes the pre-fetched KPIs. Then auto-send a first message like "Give me today's briefing" on mount (use a `useEffect` that fires once). The agent responds with a rich, opinionated summary using `getStoreSummary` and immediately surfaces the interesting stuff (low stock alert, hidden gem products, etc.) — rendered via generative UI components.
   - **Option B**: Auto-call `getStoreSummary` server-side and inject the result as the first assistant message with tool parts, so the KPIDashboard component renders immediately.

4. **Keep the suggested prompt buttons**, but move them below the welcome message (inside the chat flow), not as a static element. They should feel like conversation starters, not dashboard navigation.

### Why this matters
The evaluator should open the app and immediately see an AI that has already analyzed their store and is ready to go deeper. Not a bunch of tiles they could get from Shopify's native analytics.

---

## TASK 2: Fix text rendering — add markdown support

### Problem
The `TextBubble` component in `MessageRenderer.tsx` renders raw text with `whiteSpace: pre-wrap`. This means `**bold**` shows as literal asterisks, lists don't render, etc. The screenshot shows the AI response with `**Revenue**:` and `**AOV**:` as raw markdown syntax. This looks broken.

### What to build
1. Install `react-markdown` (and optionally `remark-gfm` for tables/strikethrough):
   ```
   npm install react-markdown remark-gfm
   ```

2. Replace the `TextBubble` component in `MessageRenderer.tsx`:
   ```tsx
   import ReactMarkdown from 'react-markdown';
   import remarkGfm from 'remark-gfm';

   function TextBubble({ text }: { text: string }) {
     if (!text.trim()) return null;
     return (
       <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--p-color-text, #202223)' }}>
         <ReactMarkdown
           remarkPlugins={[remarkGfm]}
           components={{
             // Style overrides to match Polaris aesthetic
             p: ({ children }) => <p style={{ margin: '0 0 8px 0' }}>{children}</p>,
             strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
             ul: ({ children }) => <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>{children}</ul>,
             ol: ({ children }) => <ol style={{ margin: '4px 0', paddingLeft: '20px' }}>{children}</ol>,
             li: ({ children }) => <li style={{ marginBottom: '2px' }}>{children}</li>,
             code: ({ children }) => (
               <code style={{ 
                 background: 'var(--p-color-bg-surface-secondary, #f6f6f7)', 
                 padding: '1px 4px', 
                 borderRadius: '4px', 
                 fontSize: '13px' 
               }}>
                 {children}
               </code>
             ),
             a: ({ href, children }) => (
               <a href={href} target="_blank" rel="noopener noreferrer" 
                  style={{ color: 'var(--p-color-text-brand, #008060)', textDecoration: 'underline' }}>
                 {children}
               </a>
             ),
           }}
         />
       </div>
     );
   }
   ```

---

## TASK 3: Make the KPIDashboard generative UI component actually useful

### Problem
The current `KPIDashboard.tsx` renders the same 4 generic tiles (orders, revenue, AOV, total products) that Shopify shows natively. When the agent calls `getStoreSummary`, the UI should show something the CEO can't already see.

### What to build
Redesign `KPIDashboard.tsx` to be an **insight-driven briefing card**, not a metric dump:

1. **Add computed insights to the `getStoreSummary` tool return value** in `tools.ts`. After fetching the raw data, compute:
   - Revenue trend direction (up/down vs prior equivalent period — fetch orders for the previous period too)
   - Days of inventory remaining for low-stock items (current stock ÷ daily sales velocity)
   - Highest-margin product that isn't in the top 3 by volume (the "hidden gem" signal)
   
   Return these as an `insights` array alongside the raw metrics:
   ```ts
   return {
     // ...existing fields...
     insights: [
       { type: 'trend', message: 'Revenue up 18% vs prior week', sentiment: 'positive' },
       { type: 'alert', message: 'Vitamin D Drops: ~2 days of stock at current velocity', sentiment: 'critical' },
       { type: 'opportunity', message: 'Collagen Peptides has 80% margin but only 15% of order volume', sentiment: 'opportunity' },
     ]
   };
   ```

2. **Redesign the KPIDashboard component** to lead with insights, with metrics as supporting context:
   - Top section: insight cards with color-coded left borders (green for positive, amber for alerts, blue for opportunities)
   - Bottom section: compact metric row (revenue, orders, AOV in a single row, not big cards)
   - Each insight should have a clickable action: "Dig deeper →" that sends a prompt to the chat

3. The `getStoreSummary` tool should also fetch orders for the prior period to enable comparisons. Currently it only fetches one period.

---

## TASK 4: Improve the SalesChart to actually render on the home screen

### Problem  
The screenshot shows "30-Day Sales Trend" as an empty box. The `MiniSparkline` component in `app._index.tsx` is a hand-rolled SVG polyline with no axes, labels, or tooltips. Meanwhile, the `SalesChartInner.tsx` (used by the generative UI) is a proper Recharts bar chart. The home screen sparkline should be removed (per Task 1) but make sure the Recharts-based SalesChart works reliably when triggered by the agent.

### What to verify
- The `SalesChart` component lazy-loads `SalesChartInner` via `React.lazy`. Make sure this works inside the Shopify iframe environment. If there are issues, switch to a direct import (the bundle size concern for Recharts is minimal).
- Ensure `queryOrders` with `aggregateBy: "day"` returns properly formatted data that matches what `SalesChartInner` expects.

---

## TASK 5: Polish the generative UI components

### ComparisonCard
This is the "hero" component for the demo's key moment (the Collagen insight). Make it more impactful:
- Add a "winner" visual indicator (subtle crown/star icon or highlighted border) on the product the agent recommends
- Make the `suggestedAction` a clickable button that sends the action as a chat prompt, not just green text
- Add a small sparkline or bar comparing the key metric (margin × volume = margin contribution)

### ProductGrid
- When `isAggregated` is true (revenue ranking), add a rank number (#1, #2, #3...) and a revenue bar/percentage relative to the top product
- The non-aggregated grid is decent but could use a "view in Shopify" link for each product (using App Bridge navigation)

### LiquidPreview
- The iframe preview is good. Add a "Full Screen Preview" toggle that expands it
- Add a loading state while the iframe renders
- After publishing, show the actual Shopify page URL so the user can visit it

### DiscountCard
- This is actually pretty good already. Minor: add the discount's applicable product more prominently (right now it says "All products" as default even when the context is about a specific product)

### General polish for all components
- Add subtle entrance animations (fade-in + slide-up, CSS-only, ~200ms) when components first render. This makes the generative UI feel alive.
- Make sure all components handle empty/null data gracefully without crashing

---

## TASK 6: System prompt improvements

### Problem
The system prompt is decent but doesn't push the agent hard enough to use tools over text. Looking at the screenshot, the agent responded to "How did we do this week?" with a plain text summary instead of calling `getStoreSummary` and rendering the KPIDashboard component.

### What to change in `system-prompt.ts`

Add these rules more emphatically at the top:

```
## CRITICAL: Always Use Tools for Data
NEVER respond with metrics in plain text. ALWAYS use the appropriate tool so the UI renders the data visually.

Bad: "Revenue this week was $16,477 from 250 orders with an AOV of $65.91"
Good: Call getStoreSummary → the UI renders KPI cards, insights, and alerts automatically

Bad: "Your top products are: 1. Daily Greens ($X), 2. Protein Bars ($Y)..."  
Good: Call queryOrders with aggregateBy:"product" → the UI renders a ranked product table

If the user asks ANY question about store performance, products, orders, customers, or inventory — your FIRST action must be a tool call, not a text response. Text comes AFTER the tool result to add context and suggest next actions.
```

Also add to system prompt:
```
## Response Structure
For every query:
1. Call the relevant tool(s) FIRST — the UI will render the visual
2. THEN add 1-2 sentences of insight or context after the tool result
3. End with a proactive suggestion for next action

Keep text responses SHORT. The generative UI does the heavy lifting. Your text is the "analyst commentary" — sharp, opinionated, 2-3 sentences max.
```

---

## TASK 7: Add the CSS animation keyframes

### Problem
The loading spinner in `MessageRenderer.tsx` references `animation: "spin 0.8s linear infinite"` and the typing dots reference `animation: "pulse 1.4s ease-in-out"`, but these keyframe animations may not be defined anywhere.

### What to build
Add a global style block (in `root.tsx` or the app layout) with:
```css
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

Then apply `fadeSlideIn` to tool result components when they first render (add `animation: 'fadeSlideIn 0.25s ease-out'` to the wrapper divs in the generative UI components).

---

## TASK 8: Auto-scroll improvements

### Problem
The chat auto-scrolls on every message update, but during streaming this can be janky. Also, when a large generative UI component renders (like a chart or product grid), the scroll should land below the component.

### What to fix
- Debounce the scroll slightly (use `requestAnimationFrame` or a small timeout)
- Use `scrollIntoView({ behavior: 'smooth', block: 'end' })` consistently
- When a tool result first renders (transitions from loading → result), trigger an additional scroll

---

## Execution Order

1. **Task 1** (layout flip) — This is the single biggest impact change. Do this first.
2. **Task 2** (markdown) — Quick win, fixes the most visible bug.
3. **Task 6** (system prompt) — Quick win, makes the agent actually use tools.
4. **Task 7** (CSS animations) — Quick, makes everything feel polished.
5. **Task 3** (KPIDashboard redesign) — Medium effort, high impact on first impression.
6. **Task 5** (generative UI polish) — Medium effort, compound impact across all interactions.
7. **Task 4** (SalesChart verification) — Small effort, important for the demo.
8. **Task 8** (scroll fixes) — Small quality-of-life improvement.

---

## What NOT to change
- The tool definitions and GraphQL queries are solid. Don't rewrite them.
- The confirm flow (api.confirm.ts) works well. Don't touch it.
- The MessageRenderer's tool→component mapping is correct. Just make the components better.
- The ChatInterface structure is fine. Just make it full-height and add the auto-fire.
- Don't add Klaviyo yet. Get the core experience flawless first.
