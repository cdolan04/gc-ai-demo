# Claude Code: Phase 3 — Brand Polish & Landing Page Quality

> **Context**: The AI workspace is working well. This phase focuses on making the CONTENT look real — product images, brand identity, and dramatically better landing page generation. These changes affect every product-related interaction in the demo.

---

## TASK I: Product images via seed script

### Problem
Products have no images. Every ProductGrid, ComparisonCard, and LiquidPreview is missing the visual anchor that makes it feel like a real store.

### What to build
Update `scripts/seed-store.ts` to attach images to each product. Two approaches:

**Approach A (preferred): Use free Unsplash URLs**
Shopify's `productCreateMedia` mutation can fetch images from external URLs. Curate 10 high-quality supplement product photos from Unsplash and hardcode the URLs in the seed script. Search Unsplash for terms like "supplement bottle", "vitamin capsules", "protein powder", "collagen powder", "fish oil capsules" etc.

Example addition to the seed script:
```ts
const PRODUCT_IMAGES: Record<string, string> = {
  'Collagen Peptides': 'https://images.unsplash.com/photo-XXXXXX?w=800',
  'Daily Greens Powder': 'https://images.unsplash.com/photo-XXXXXX?w=800',
  // ... etc for all 10 products
};

// After creating each product, attach the image:
const CREATE_MEDIA = `#graphql
  mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
    productCreateMedia(productId: $productId, media: $media) {
      media { id status }
      mediaUserErrors { field message }
    }
  }
`;

await gql(admin, CREATE_MEDIA, {
  productId: product.id,
  media: [{
    originalSource: PRODUCT_IMAGES[productTitle],
    mediaContentType: 'IMAGE',
    alt: productTitle,
  }],
});
```

**Approach B: Use placeholder product images**
If Unsplash images are hard to find for specific supplement types, use a service like `https://placehold.co/800x800/f0f0f0/333?text=Collagen+Peptides` as a fallback during development, then swap for real photos before the Loom recording.

### Important
The seed script runs via `shopify app dev` which has network access. Shopify's servers fetch the external image URL — Claude Code's network restrictions don't apply here because it's Shopify doing the download.

After uploading images, verify they appear in the products query via `featuredMedia.preview.image.url`. This is the URL that gets used everywhere — ProductGrid, ComparisonCard, and landing page generation.

---

## TASK II: Brand identity (minimal, 30 minutes max)

### What to build
Give the demo store a believable brand identity. This affects:
- The store name visible in the Shopify admin header
- The published landing page appearance (renders inside the store's theme)
- The overall "realness" of the demo

**Step 1: Brand name and basics**
Pick a clean DTC supplement brand name. Examples: "Vitalé", "Nourish Co", "Peak Nutrition", "Everwell". Whatever feels like a real brand, not a test store. Update the store name in Shopify admin settings.

**Step 2: Generate a simple SVG logo**
Create a minimal text-based SVG logo (just the brand name in a clean font). Write it directly — no external tools needed:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 50">
  <text x="0" y="35" font-family="system-ui, -apple-system, sans-serif" 
        font-size="28" font-weight="600" fill="#1a1a2e">Everwell</text>
</svg>
```
Upload this as the store logo via Shopify admin (Settings → Brand).

**Step 3: Theme color customization**
In the Shopify admin, go to Online Store → Themes → Customize → Theme settings. Set:
- Primary color: something that matches the brand (e.g., a deep green #1a472a for a wellness brand)
- Background: white
- Text: near-black #1a1a2e
- Accent: a warm highlight color

This takes 5 minutes and means published landing pages render inside a theme that looks intentional.

---

## TASK III: Landing page generation quality (HIGH PRIORITY)

### Problem
The AI generates functional but boring HTML for landing pages. This is the most visible "write" action in the demo — when the CEO says "build me a landing page for Collagen," the preview needs to look like a real DTC landing page, not a homework assignment.

### What to change

**Update the system prompt section about landing page generation** in `system-prompt.ts`:

```
## Landing Page Generation — CRITICAL
When generating a landing page with generateLiquidPage, you are building a REAL marketing page. This is the highlight of the demo. The HTML must look like a professional DTC landing page.

Structure (top to bottom):
1. HERO SECTION: Full-width, product image on one side, headline + price + CTA on the other. Use a subtle gradient or colored background. The headline should be benefit-driven, not just the product name (e.g., "The Collagen Your Body Actually Absorbs" not "Collagen Peptides").
2. SOCIAL PROOF BAR: A simple line like "★★★★★ Loved by 500+ customers" or "Join 200+ subscribers". Use the customer data you already have to make this real.
3. BENEFITS GRID: 3-4 benefit cards with emoji icons. Pull from the product description but rewrite as benefit statements ("Supports joint health & skin elasticity" not "Contains hydrolyzed collagen peptides").
4. PRODUCT DETAILS: Price, what's included (variant info), ingredients highlights.
5. CTA SECTION: If a discount code exists from earlier in the conversation, feature it prominently: "Use code COLLAGEN15 for 15% off your first order." Large, branded "Shop Now" button.
6. TRUST SIGNALS: "Free shipping on orders over $50" / "30-day money back guarantee" / "Third-party tested"

Design rules for the HTML:
- Use inline CSS (required for Shopify pages)
- Use a clean, modern color palette — not just black and white. Pick a primary brand color and use it for CTAs and accents.
- Use the actual product image URL from Shopify CDN (from your prior queryProducts call)
- Max-width the content at 800px, center it
- Use generous padding and whitespace — don't cram everything together
- Typography: use system font stack, but vary sizes dramatically (48px hero headline, 16px body)
- Mobile-friendly: use percentage widths, not fixed pixel widths
- The page should look good enough that a CEO would be proud to share the URL
```

**Also update the `generateLiquidPage` tool description** in `tools.ts` to reinforce this:
```ts
description: "Generate a professional DTC-quality HTML landing page for a product. The page should look like a real marketing landing page with hero section, social proof, benefits grid, and CTA. Returns a preview — the page is NOT published until the user confirms. ALWAYS use real product data (title, price, description, image URLs) from prior queryProducts tool calls.",
```

### Why this matters
This is the "wow" moment. When the preview iframe renders a page that looks like something from a real supplement brand's website, the evaluator sees the entire value proposition: the AI didn't just answer a question, it built a marketing asset using real store data, and it looks good. If the page is generic HTML with no design, that moment falls flat.

---

## TASK IV: Update ProductGrid to use images prominently

### Problem
The ProductGrid component has image support but the images are small (120px height container). When products have good photos, they should be more prominent.

### What to change
In `ProductGrid.tsx`, increase the image container:
- Make images 160px height for the card view
- If an image is present, make it the visual anchor of the card
- If no image, show a tasteful placeholder (light gray with the first letter of the product name, not a broken image icon)

```tsx
{product.image ? (
  <div style={{
    height: '160px',
    background: '#f8f8f8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  }}>
    <img
      src={product.image}
      alt={product.title || ''}
      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
    />
  </div>
) : (
  <div style={{
    height: '160px',
    background: 'linear-gradient(135deg, #f0f0f0, #e8e8e8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '36px',
    fontWeight: 700,
    color: '#ccc',
  }}>
    {(product.title || '?')[0]}
  </div>
)}
```

Do the same for `ComparisonCard.tsx` — make product images larger and more prominent in the comparison view.

---

## TASK V: Product descriptions in seed data

### Problem
If the seed script creates products with generic or empty descriptions, the AI has nothing compelling to work with when generating landing pages.

### What to build
Update the seed script to include rich, realistic product descriptions for each product. These should read like real DTC supplement copy:

```ts
const PRODUCT_DESCRIPTIONS: Record<string, string> = {
  'Collagen Peptides': `<p>Hydrolyzed collagen peptides sourced from grass-fed, pasture-raised bovine. Our Type I & III collagen is enzymatically processed for maximum absorption, supporting skin elasticity, joint comfort, and gut health.</p>
<p><strong>Key Benefits:</strong></p>
<ul>
<li>Supports skin hydration and elasticity</li>
<li>Promotes joint flexibility and comfort</li>
<li>Supports gut lining integrity</li>
<li>Dissolves easily in hot or cold beverages</li>
</ul>
<p>20g collagen per serving · Unflavored · 30 servings per container</p>`,

  'Daily Greens Powder': `<p>A comprehensive blend of 40+ organic greens, fruits, and vegetables in one scoop. Packed with spirulina, chlorella, wheatgrass, and adaptogenic mushrooms for daily whole-body nutrition.</p>
<p><strong>Key Benefits:</strong></p>
<ul>
<li>Supports energy and vitality</li>
<li>Promotes healthy digestion with prebiotics and probiotics</li>
<li>Rich in antioxidants for immune support</li>
<li>Refreshing natural berry flavor</li>
</ul>
<p>40+ organic ingredients · Natural berry flavor · 30 servings per container</p>`,

  // ... similar quality descriptions for all 10 products
};
```

Generate complete, compelling descriptions for all 10 products. These descriptions directly feed into:
1. The ProductGrid display
2. The AI's context when generating landing pages
3. The AI's analysis when recommending products

---

## Execution Order

1. **Task V** (product descriptions) — Do first, it's just data and everything else uses it.
2. **Task I** (product images) — Do second, biggest visual impact.
3. **Task III** (landing page quality) — System prompt change, very high ROI.
4. **Task IV** (ProductGrid images) — Quick component tweak.
5. **Task II** (brand identity) — Last, lowest priority but nice for the Loom.

---

## What NOT to build
- Don't build a custom Shopify theme or storefront homepage
- Don't build a full brand guide document
- Don't customize Dawn beyond basic colors/logo
- Don't create collections with custom imagery
- Don't add metafields for brand content
- The evaluator spends 99% of the demo in the admin app, not the storefront
