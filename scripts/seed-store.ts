/**
 * Seed script for the Growth Capital AI demo store.
 *
 * Creates curated data for a DTC supplement brand (NutriVital):
 * - 10 products with 2-3 variants each, real prices, costs, and inventory
 * - ~157 customers across 6 behavioral segments
 * - ~200 orders with real prices and backdated dates (spread over 45 days)
 *
 * The data is designed to support specific demo narratives:
 * - Collagen Peptides: high margin, high reorder rate, undermarketed (the "hidden gem")
 * - Daily Greens: top seller by volume but lower margin
 * - Protein Bars + Electrolyte Mix: frequent co-purchase (bundle opportunity)
 * - Vitamin D Drops: low stock with recent sales spike
 *
 * Usage:
 *   npx tsx scripts/seed-store.ts
 *
 * Requires `shopify app dev` running and the app opened at least once
 * (reads the session token from the app's Prisma DB).
 *
 * Idempotent — checks for existing data before creating. Safe to re-run.
 */

import { PrismaClient } from "@prisma/client";

const STORE = "gc-ai-demo.myshopify.com";
const ENDPOINT = `https://${STORE}/admin/api/2025-10/graphql.json`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
function randomPick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function getToken(): Promise<string> {
  const prisma = new PrismaClient();
  const sessions = await prisma.session.findMany();
  await prisma.$disconnect();
  const token = sessions[0]?.accessToken;
  if (!token) throw new Error("No session token. Run `shopify app dev` and open the app first.");
  return token;
}

async function gql(query: string, variables: Record<string, unknown> = {}): Promise<any> {
  const token = await getToken();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 429) {
    console.log("  Rate limited, waiting 3s...");
    await sleep(3000);
    return gql(query, variables);
  }

  const json = await res.json();

  if (json.errors) {
    const msg = json.errors[0]?.message || "";
    if (msg.includes("Invalid API key") || msg.includes("access token")) {
      console.log("  Token expired, retrying...");
      await sleep(3000);
      return gql(query, variables);
    }
    console.error("  GraphQL error:", msg);
  }

  // Throttle if budget is low
  const cost = json.extensions?.cost;
  if (cost?.throttleStatus?.currentlyAvailable < 200) {
    const wait = Math.ceil(((200 - cost.throttleStatus.currentlyAvailable) / cost.throttleStatus.restoreRate) * 1000);
    await sleep(wait);
  }

  return json.data;
}

// ---------------------------------------------------------------------------
// Product definitions
// ---------------------------------------------------------------------------
const PRODUCTS = [
  {
    title: "Collagen Peptides", productType: "Supplement", vendor: "NutriVital",
    descriptionHtml: "<p>Premium grass-fed collagen peptides for skin, hair, nail, and joint health. Easily dissolves in hot or cold liquids. Unflavored and unsweetened — add to your morning coffee, smoothie, or baking recipes.</p><p>Third-party tested for purity. 20g protein per serving. No artificial ingredients.</p>",
    variants: [
      { title: "30-Day Supply", price: "39.99", cost: "8.00", inventory: 120 },
      { title: "60-Day Supply", price: "69.99", cost: "14.00", inventory: 80 },
      { title: "90-Day Supply", price: "94.99", cost: "19.00", inventory: 45 },
    ],
  },
  {
    title: "Daily Greens Powder", productType: "Supplement", vendor: "NutriVital",
    descriptionHtml: "<p>A comprehensive daily greens blend with 40+ organic superfoods. Supports energy, digestion, and immunity. Refreshing natural berry flavor that actually tastes good.</p><p>Includes spirulina, chlorella, wheatgrass, ashwagandha, and digestive enzymes.</p>",
    variants: [
      { title: "30-Day Supply", price: "34.99", cost: "15.00", inventory: 200 },
      { title: "60-Day Supply", price: "59.99", cost: "26.00", inventory: 130 },
    ],
  },
  {
    title: "Protein Bars - Variety Pack", productType: "Snack", vendor: "NutriVital",
    descriptionHtml: "<p>Clean protein bars with 20g protein and only 2g sugar. Variety pack includes: Chocolate Peanut Butter, Cookies & Cream, and Birthday Cake. Perfect post-workout or as a healthy snack.</p><p>No artificial sweeteners. Gluten-free.</p>",
    variants: [
      { title: "12-Pack", price: "29.99", cost: "12.00", inventory: 90 },
      { title: "24-Pack", price: "54.99", cost: "22.00", inventory: 55 },
    ],
  },
  {
    title: "Electrolyte Mix", productType: "Supplement", vendor: "NutriVital",
    descriptionHtml: "<p>Zero-sugar electrolyte powder with real Himalayan pink salt, magnesium, potassium, and calcium. Rapid hydration for athletes, travelers, and anyone who wants to feel their best.</p><p>Lemon-lime flavor. 60 stick packs per box.</p>",
    variants: [
      { title: "30 Sticks", price: "24.99", cost: "8.00", inventory: 85 },
      { title: "60 Sticks", price: "44.99", cost: "14.00", inventory: 60 },
    ],
  },
  {
    title: "Vitamin D Drops", productType: "Supplement", vendor: "NutriVital",
    descriptionHtml: "<p>High-potency Vitamin D3 + K2 liquid drops for optimal calcium absorption and immune support. 5000 IU per drop. MCT oil base for maximum bioavailability.</p><p>365 servings per bottle. Glass dropper for precise dosing.</p>",
    variants: [
      { title: "1 Bottle", price: "19.99", cost: "4.00", inventory: 15 },
      { title: "3-Pack", price: "49.99", cost: "10.00", inventory: 8 },
    ],
  },
  {
    title: "Omega-3 Fish Oil", productType: "Supplement", vendor: "NutriVital",
    descriptionHtml: "<p>Triple-strength omega-3 fish oil with 2400mg EPA/DHA per serving. Molecularly distilled for purity. Enteric-coated softgels — no fishy burps.</p><p>Supports heart, brain, and joint health.</p>",
    variants: [
      { title: "90 Softgels", price: "24.99", cost: "9.00", inventory: 150 },
      { title: "180 Softgels", price: "44.99", cost: "16.00", inventory: 75 },
    ],
  },
  {
    title: "Probiotic Capsules", productType: "Supplement", vendor: "NutriVital",
    descriptionHtml: "<p>50 billion CFU probiotic with 12 clinically studied strains. Delayed-release capsules survive stomach acid. Supports digestive balance and immune function.</p><p>Shelf-stable — no refrigeration needed.</p>",
    variants: [
      { title: "30 Capsules", price: "29.99", cost: "10.00", inventory: 110 },
      { title: "60 Capsules", price: "52.99", cost: "18.00", inventory: 65 },
    ],
  },
  {
    title: "Magnesium Complex", productType: "Supplement", vendor: "NutriVital",
    descriptionHtml: "<p>Triple-form magnesium complex: glycinate, taurate, and malate. Optimized for sleep, muscle recovery, and stress relief. Gentle on the stomach.</p><p>400mg elemental magnesium per serving. 120 capsules.</p>",
    variants: [
      { title: "60 Capsules", price: "19.99", cost: "6.00", inventory: 180 },
      { title: "120 Capsules", price: "34.99", cost: "10.00", inventory: 100 },
    ],
  },
  {
    title: "Turmeric Curcumin", productType: "Supplement", vendor: "NutriVital",
    descriptionHtml: "<p>High-potency turmeric curcumin with BioPerine for 2000% better absorption. 1500mg turmeric with 95% curcuminoids per serving. Supports joint comfort and healthy inflammation response.</p>",
    variants: [
      { title: "60 Capsules", price: "27.99", cost: "8.00", inventory: 95 },
      { title: "120 Capsules", price: "49.99", cost: "14.00", inventory: 50 },
    ],
  },
  {
    title: "Pre-Workout Blend", productType: "Supplement", vendor: "NutriVital",
    descriptionHtml: "<p>Clean energy pre-workout with natural caffeine, beta-alanine, L-citrulline, and B-vitamins. No artificial colors or flavors. Watermelon flavor. Mixes instantly.</p><p>200mg caffeine from green tea extract. No crash, no jitters.</p>",
    variants: [
      { title: "30 Servings", price: "32.99", cost: "11.00", inventory: 70 },
      { title: "60 Servings", price: "57.99", cost: "20.00", inventory: 40 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Customer segments
// ---------------------------------------------------------------------------
const FIRST_NAMES = [
  "Emma","Liam","Olivia","Noah","Ava","Ethan","Sophia","Mason",
  "Isabella","William","Mia","James","Charlotte","Benjamin","Amelia",
  "Lucas","Harper","Henry","Evelyn","Alexander","Abigail","Daniel",
  "Emily","Michael","Elizabeth","Sebastian","Sofia","Jack","Avery",
  "Owen","Ella","Aiden","Scarlett","Samuel","Grace","Ryan","Lily",
  "Nathan","Chloe","Caleb","Victoria","Christian","Riley","Dylan",
  "Aria","Isaac","Zoey","Andrew","Nora","Joshua",
];
const LAST_NAMES = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller",
  "Davis","Rodriguez","Martinez","Hernandez","Lopez","Gonzalez",
  "Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin",
  "Lee","Perez","Thompson","White","Harris","Sanchez","Clark",
  "Ramirez","Lewis","Robinson",
];
const CITIES = [
  { city: "New York", province: "NY", zip: "10001" },
  { city: "Los Angeles", province: "CA", zip: "90001" },
  { city: "Chicago", province: "IL", zip: "60601" },
  { city: "Houston", province: "TX", zip: "77001" },
  { city: "Phoenix", province: "AZ", zip: "85001" },
  { city: "Austin", province: "TX", zip: "73301" },
  { city: "Denver", province: "CO", zip: "80201" },
  { city: "Portland", province: "OR", zip: "97201" },
  { city: "Seattle", province: "WA", zip: "98101" },
  { city: "Miami", province: "FL", zip: "33101" },
];

const SEGMENTS = [
  { tag: "collagen-loyalist", count: 12 },
  { tag: "high-value", count: 18 },
  { tag: "bundle-buyer", count: 22 },
  { tag: "one-time", count: 55 },
  { tag: "lapsed", count: 28 },
  { tag: "recent-new", count: 22 },
];

// ---------------------------------------------------------------------------
// Seed: Products
// ---------------------------------------------------------------------------
async function seedProducts(locationId: string) {
  console.log("\n=== Seeding Products ===\n");

  const existing = await gql(`query { products(first: 50) { edges { node { id title variants(first: 10) { edges { node { id title price inventoryItem { id } } } } } } } }`);
  const existingTitles = existing.products.edges.map((e: any) => e.node.title);

  if (existingTitles.includes("Collagen Peptides") && existingTitles.includes("Pre-Workout Blend") && existing.products.edges.length >= 10) {
    console.log("All 10 products exist. Skipping creation.\n");
    return existing.products.edges.map((e: any) => ({
      id: e.node.id, title: e.node.title,
      variants: e.node.variants.edges.map((v: any) => v.node),
    }));
  }

  const results: any[] = [];

  for (const spec of PRODUCTS) {
    if (existingTitles.includes(spec.title)) {
      console.log(`  Exists: ${spec.title}`);
      const ex = existing.products.edges.find((e: any) => e.node.title === spec.title);
      results.push({ id: ex.node.id, title: spec.title, variants: ex.node.variants.edges.map((v: any) => v.node) });
      continue;
    }

    console.log(`  Creating: ${spec.title}`);

    // Create product with first variant
    const created = await gql(`
      mutation productCreate($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product { id title variants(first: 1) { edges { node { id title inventoryItem { id } } } } }
          userErrors { field message }
        }
      }
    `, {
      product: { title: spec.title, productType: spec.productType, vendor: spec.vendor, descriptionHtml: spec.descriptionHtml, status: "ACTIVE" },
    });

    if (created.productCreate.userErrors?.length > 0) {
      console.error(`    Error:`, created.productCreate.userErrors[0].message);
      continue;
    }

    const product = created.productCreate.product;
    const defaultVariantId = product.variants.edges[0].node.id;

    // Update default variant price + title
    await gql(`
      mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants { id title price }
          userErrors { field message }
        }
      }
    `, {
      productId: product.id,
      variants: [{ id: defaultVariantId, price: spec.variants[0].price, optionValues: [{ name: spec.variants[0].title, optionName: "Title" }] }],
    });

    // Create additional variants
    if (spec.variants.length > 1) {
      await gql(`
        mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkCreate(productId: $productId, variants: $variants) {
            productVariants { id title price }
            userErrors { field message }
          }
        }
      `, {
        productId: product.id,
        variants: spec.variants.slice(1).map((v) => ({
          price: v.price,
          optionValues: [{ name: v.title, optionName: "Title" }],
        })),
      });
    }

    await sleep(500);

    // Re-fetch all variants for cost + inventory
    const refetch = await gql(`query ($id: ID!) { product(id: $id) { variants(first: 10) { edges { node { id title price inventoryItem { id } } } } } }`, { id: product.id });
    const allVariants = refetch.product.variants.edges.map((e: any) => e.node);

    // Set costs and inventory
    for (let i = 0; i < allVariants.length && i < spec.variants.length; i++) {
      await gql(`mutation ($id: ID!, $input: InventoryItemInput!) { inventoryItemUpdate(id: $id, input: $input) { inventoryItem { id } userErrors { field message } } }`,
        { id: allVariants[i].inventoryItem.id, input: { cost: spec.variants[i].cost } });
      await gql(`mutation ($input: InventorySetOnHandQuantitiesInput!) { inventorySetOnHandQuantities(input: $input) { inventoryAdjustmentGroup { reason } userErrors { field message } } }`,
        { input: { reason: "correction", setQuantities: [{ inventoryItemId: allVariants[i].inventoryItem.id, locationId, quantity: spec.variants[i].inventory }] } });
    }

    results.push({ id: product.id, title: spec.title, variants: allVariants });
    console.log(`    Done: ${allVariants.length} variants`);
    await sleep(300);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Seed: Customers
// ---------------------------------------------------------------------------
async function seedCustomers() {
  console.log("\n=== Seeding Customers ===\n");

  const check = await gql(`query { customers(first: 5, query: "email:*@example.com") { edges { node { id } } } }`);
  if (check.customers.edges.length > 0) {
    console.log("Customers already seeded. Loading existing...\n");
    const all = await gql(`query { customers(first: 250) { edges { node { id displayName email tags } } } }`);
    return all.customers.edges.map((e: any) => ({
      id: e.node.id, name: e.node.displayName, email: e.node.email, segment: e.node.tags?.[0] || "one-time",
    }));
  }

  const customers: any[] = [];
  let idx = 0;

  for (const segment of SEGMENTS) {
    for (let i = 0; i < segment.count; i++) {
      const firstName = FIRST_NAMES[idx % FIRST_NAMES.length];
      const lastName = LAST_NAMES[idx % LAST_NAMES.length];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${idx}@example.com`;
      const loc = randomPick(CITIES);
      idx++;

      const data = await gql(`
        mutation customerCreate($input: CustomerInput!) {
          customerCreate(input: $input) { customer { id displayName email } userErrors { field message } }
        }
      `, {
        input: {
          firstName, lastName, email, tags: [segment.tag],
          addresses: [{ address1: `${randomInt(100, 9999)} Main St`, city: loc.city, provinceCode: loc.province, zip: loc.zip, countryCode: "US" }],
        },
      });

      if (data?.customerCreate?.customer) {
        customers.push({ id: data.customerCreate.customer.id, name: `${firstName} ${lastName}`, email, segment: segment.tag });
      }

      if (idx % 10 === 0) {
        console.log(`  Created ${idx} customers...`);
        await sleep(500);
      }
    }
  }

  console.log(`  Done: ${customers.length} customers\n`);
  return customers;
}

// ---------------------------------------------------------------------------
// Seed: Orders (via GraphQL orderCreate — supports prices + backdating)
// ---------------------------------------------------------------------------
async function seedOrders(products: any[], customers: any[]) {
  console.log("\n=== Seeding Orders ===\n");

  console.log(`  Creating 200 orders with fresh dates...\n`);

  const TARGET = 200;
  const productMap = new Map(products.map((p: any) => [p.title, p]));

  const WEIGHTS = [
    { title: "Daily Greens Powder", weight: 45 },
    { title: "Protein Bars - Variety Pack", weight: 20 },
    { title: "Electrolyte Mix", weight: 18 },
    { title: "Collagen Peptides", weight: 15 },
    { title: "Vitamin D Drops", weight: 12 },
    { title: "Omega-3 Fish Oil", weight: 10 },
    { title: "Probiotic Capsules", weight: 8 },
    { title: "Magnesium Complex", weight: 6 },
    { title: "Turmeric Curcumin", weight: 7 },
    { title: "Pre-Workout Blend", weight: 7 },
  ];
  const totalWeight = WEIGHTS.reduce((s, p) => s + p.weight, 0);

  function pickProduct(): string {
    let r = Math.random() * totalWeight;
    for (const p of WEIGHTS) { r -= p.weight; if (r <= 0) return p.title; }
    return WEIGHTS[0].title;
  }

  function getVariant(title: string) {
    const p = productMap.get(title);
    if (!p || !p.variants.length) return null;
    return randomPick(p.variants);
  }

  const BEHAVIOR: Record<string, { orders: number; products?: string[] }> = {
    "collagen-loyalist": { orders: 3, products: ["Collagen Peptides"] },
    "high-value": { orders: 4 },
    "bundle-buyer": { orders: 2, products: ["Protein Bars - Variety Pack", "Electrolyte Mix"] },
    "one-time": { orders: 1 },
    "lapsed": { orders: 1 },
    "recent-new": { orders: 1 },
  };

  let created = 0;

  for (const customer of customers) {
    if (created >= TARGET) break;
    const beh = BEHAVIOR[customer.segment] || { orders: 1 };

    for (let o = 0; o < beh.orders && created < TARGET; o++) {
      const lineItems: Array<{ variantId: string; quantity: number; priceSet: { shopMoney: { amount: string; currencyCode: string } } }> = [];

      if (beh.products) {
        for (const t of beh.products) {
          const v = getVariant(t);
          if (v) lineItems.push({ variantId: v.id, quantity: randomInt(1, 2), priceSet: { shopMoney: { amount: v.price, currencyCode: "USD" } } });
        }
      }

      for (let e = 0; e < randomInt(0, 2); e++) {
        const v = getVariant(pickProduct());
        if (v && !lineItems.find((li) => li.variantId === v.id)) {
          lineItems.push({ variantId: v.id, quantity: 1, priceSet: { shopMoney: { amount: v.price, currencyCode: "USD" } } });
        }
      }
      if (lineItems.length === 0) continue;

      // Backdate: spread over last 45 days, weighted recent
      let daysAgo: number;
      if (customer.segment === "recent-new") daysAgo = randomInt(1, 14);
      else if (customer.segment === "lapsed") daysAgo = randomInt(45, 60);
      else daysAgo = Math.floor(Math.pow(Math.random(), 0.7) * 45);

      // Vitamin D spike in last 10 days
      const vitD = productMap.get("Vitamin D Drops");
      if (vitD && lineItems.some((li) => vitD.variants.some((v: any) => v.id === li.variantId))) {
        daysAgo = Math.min(daysAgo, randomInt(1, 10));
      }

      const date = new Date();
      date.setDate(date.getDate() - daysAgo);

      // Retry loop for rate limits
      let success = false;
      for (let attempt = 0; attempt < 5 && !success; attempt++) {
        const data = await gql(`
          mutation orderCreate($order: OrderCreateOrderInput!) {
            orderCreate(order: $order) { order { id } userErrors { field message } }
          }
        `, {
          order: {
            customerId: customer.id,
            lineItems,
            financialStatus: "PAID",
            processedAt: date.toISOString(),
            tags: ["seed", customer.segment],
          },
        });

        if (data?.orderCreate?.order) {
          created++;
          success = true;
        } else {
          const msg = data?.orderCreate?.userErrors?.[0]?.message || "";
          if (msg.includes("Too many") || msg.includes("throttl")) {
            console.log(`  Rate limited, waiting 10s... (attempt ${attempt + 1})`);
            await sleep(10000);
          } else if (msg) {
            console.error(`  Error: ${msg}`);
            break;
          } else {
            await sleep(5000);
          }
        }
      }

      if (created % 10 === 0 && created > 0) {
        console.log(`  Created ${created} orders...`);
        await sleep(2000);
      } else {
        await sleep(1000);
      }
    }
  }

  console.log(`  Done: ${created} orders\n`);
}

// ---------------------------------------------------------------------------
// Cleanup: Delete old seed orders
// ---------------------------------------------------------------------------
async function cleanupSeedOrders() {
  console.log("\n=== Cleaning Up Old Seed Orders ===\n");

  const token = await getToken();
  const restBase = `https://${STORE}/admin/api/2025-10`;

  // Helper for REST calls
  async function rest(method: string, path: string): Promise<{ status: number; data: unknown }> {
    const res = await fetch(`${restBase}${path}`, {
      method,
      headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
    });
    if (res.status === 429) {
      console.log("  Rate limited, waiting 3s...");
      await sleep(3000);
      return rest(method, path);
    }
    const data = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
    return { status: res.status, data };
  }

  // Query all seed-tagged orders via GraphQL (paginated)
  let cursor: string | null = null;
  let deleted = 0;
  let hasMore = true;

  while (hasMore) {
    const afterClause = cursor ? `, after: "${cursor}"` : "";
    const result = await gql(`
      query {
        orders(first: 250, query: "tag:seed"${afterClause}) {
          edges {
            node { id }
            cursor
          }
          pageInfo { hasNextPage }
        }
      }
    `);

    const edges = result?.orders?.edges || [];
    hasMore = result?.orders?.pageInfo?.hasNextPage || false;
    if (edges.length > 0) cursor = edges[edges.length - 1].cursor;

    for (const { node } of edges) {
      // Extract numeric ID from GID (gid://shopify/Order/12345 → 12345)
      const numericId = node.id.split("/").pop();

      // Cancel first (required before delete), ignore errors if already cancelled
      await rest("POST", `/orders/${numericId}/cancel.json`);
      // Delete
      const { status } = await rest("DELETE", `/orders/${numericId}.json`);
      if (status === 200 || status === 204) {
        deleted++;
      }

      if (deleted % 25 === 0 && deleted > 0) {
        console.log(`  Deleted ${deleted} orders...`);
      }
      await sleep(250); // gentle rate limiting
    }

    if (edges.length === 0) break;
  }

  console.log(`  Done: deleted ${deleted} seed orders\n`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\nSeeding store: ${STORE}\n`);

  // Verify token works
  const shop = await gql(`query { shop { name } }`);
  if (!shop?.shop) {
    console.error("Cannot connect. Make sure `shopify app dev` is running and you've opened the app.");
    process.exit(1);
  }
  console.log(`Connected to: ${shop.shop.name}`);

  // Get location
  const locData = await gql(`query { locations(first: 1) { edges { node { id name } } } }`);
  const locationId = locData.locations.edges[0]?.node?.id;
  if (!locationId) { console.error("No location found."); process.exit(1); }
  console.log(`Location: ${locData.locations.edges[0].node.name}`);

  const products = await seedProducts(locationId);
  const customers = await seedCustomers();
  await cleanupSeedOrders();
  await seedOrders(products, customers);

  console.log("=== Seeding Complete ===\n");
}

main().catch((err) => { console.error("Fatal:", err.message); process.exit(1); });
