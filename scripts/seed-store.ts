/**
 * Seed script for the Growth Capital AI demo store.
 *
 * Usage:
 *   npx tsx scripts/seed-store.ts
 *
 * Requires SHOPIFY_STORE and SHOPIFY_ACCESS_TOKEN env vars.
 * Get the access token from: Shopify Admin → Settings → Apps → Develop apps → create app → install → get token.
 *
 * This script is idempotent — it checks for existing products before creating.
 */

const STORE = process.env.SHOPIFY_STORE || "gc-ai-demo.myshopify.com";
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN || "";
const API_VERSION = "2025-10";

if (!TOKEN) {
  console.error(
    "Missing SHOPIFY_ACCESS_TOKEN. Set it in your environment or .env file.",
  );
  console.error(
    "Get it from: Shopify Admin → Settings → Apps → Develop apps → create app → install → Admin API access token",
  );
  process.exit(1);
}

const ENDPOINT = `https://${STORE}/admin/api/${API_VERSION}/graphql.json`;

// ---------------------------------------------------------------------------
// GraphQL helper with rate-limit handling
// ---------------------------------------------------------------------------
async function gql(query: string, variables: Record<string, any> = {}): Promise<any> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 429) {
    console.log("  Rate limited, waiting 2s...");
    await sleep(2000);
    return gql(query, variables);
  }

  const json = await res.json();

  if (json.errors) {
    console.error("GraphQL errors:", JSON.stringify(json.errors, null, 2));
  }

  // Check cost and throttle if needed
  const cost = json.extensions?.cost;
  if (cost && cost.throttleStatus) {
    const { currentlyAvailable, restoreRate } = cost.throttleStatus;
    if (currentlyAvailable < 100) {
      const waitMs = Math.ceil(((100 - currentlyAvailable) / restoreRate) * 1000);
      console.log(`  Low budget (${currentlyAvailable}), waiting ${waitMs}ms...`);
      await sleep(waitMs);
    }
  }

  return json.data;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Product definitions (from GAMEPLAN Section 7d)
// ---------------------------------------------------------------------------
const PRODUCTS = [
  {
    title: "Collagen Peptides",
    productType: "Supplement",
    vendor: "NutriVital",
    descriptionHtml:
      "<p>Premium grass-fed collagen peptides for skin, hair, nail, and joint health. Easily dissolves in hot or cold liquids. Unflavored and unsweetened — add to your morning coffee, smoothie, or baking recipes.</p><p>Third-party tested for purity. 20g protein per serving. No artificial ingredients.</p>",
    variants: [
      { title: "30-Day Supply", price: "39.99", sku: "COLL-30", inventory: 120, cost: "8.00" },
      { title: "60-Day Supply", price: "69.99", sku: "COLL-60", inventory: 80, cost: "14.00" },
      { title: "90-Day Supply", price: "94.99", sku: "COLL-90", inventory: 45, cost: "19.00" },
    ],
  },
  {
    title: "Daily Greens Powder",
    productType: "Supplement",
    vendor: "NutriVital",
    descriptionHtml:
      "<p>A comprehensive daily greens blend with 40+ organic superfoods. Supports energy, digestion, and immunity. Refreshing natural berry flavor that actually tastes good.</p><p>Includes spirulina, chlorella, wheatgrass, ashwagandha, and digestive enzymes.</p>",
    variants: [
      { title: "30-Day Supply", price: "34.99", sku: "GREEN-30", inventory: 200, cost: "15.00" },
      { title: "60-Day Supply", price: "59.99", sku: "GREEN-60", inventory: 130, cost: "26.00" },
    ],
  },
  {
    title: "Protein Bars - Variety Pack",
    productType: "Snack",
    vendor: "NutriVital",
    descriptionHtml:
      "<p>Clean protein bars with 20g protein and only 2g sugar. Variety pack includes: Chocolate Peanut Butter, Cookies & Cream, and Birthday Cake. Perfect post-workout or as a healthy snack.</p><p>No artificial sweeteners. Gluten-free.</p>",
    variants: [
      { title: "12-Pack", price: "29.99", sku: "BAR-12", inventory: 90, cost: "12.00" },
      { title: "24-Pack", price: "54.99", sku: "BAR-24", inventory: 55, cost: "22.00" },
    ],
  },
  {
    title: "Electrolyte Mix",
    productType: "Supplement",
    vendor: "NutriVital",
    descriptionHtml:
      "<p>Zero-sugar electrolyte powder with real Himalayan pink salt, magnesium, potassium, and calcium. Rapid hydration for athletes, travelers, and anyone who wants to feel their best.</p><p>Lemon-lime flavor. 60 stick packs per box.</p>",
    variants: [
      { title: "30 Sticks", price: "24.99", sku: "ELEC-30", inventory: 85, cost: "8.00" },
      { title: "60 Sticks", price: "44.99", sku: "ELEC-60", inventory: 60, cost: "14.00" },
    ],
  },
  {
    title: "Vitamin D Drops",
    productType: "Supplement",
    vendor: "NutriVital",
    descriptionHtml:
      "<p>High-potency Vitamin D3 + K2 liquid drops for optimal calcium absorption and immune support. 5000 IU per drop. MCT oil base for maximum bioavailability.</p><p>365 servings per bottle. Glass dropper for precise dosing.</p>",
    variants: [
      { title: "1 Bottle", price: "19.99", sku: "VITD-1", inventory: 15, cost: "4.00" },
      { title: "3-Pack", price: "49.99", sku: "VITD-3", inventory: 8, cost: "10.00" },
    ],
  },
  {
    title: "Omega-3 Fish Oil",
    productType: "Supplement",
    vendor: "NutriVital",
    descriptionHtml:
      "<p>Triple-strength omega-3 fish oil with 2400mg EPA/DHA per serving. Molecularly distilled for purity. Enteric-coated softgels — no fishy burps.</p><p>Supports heart, brain, and joint health.</p>",
    variants: [
      { title: "90 Softgels", price: "24.99", sku: "OMEGA-90", inventory: 150, cost: "9.00" },
      { title: "180 Softgels", price: "44.99", sku: "OMEGA-180", inventory: 75, cost: "16.00" },
    ],
  },
  {
    title: "Probiotic Capsules",
    productType: "Supplement",
    vendor: "NutriVital",
    descriptionHtml:
      "<p>50 billion CFU probiotic with 12 clinically studied strains. Delayed-release capsules survive stomach acid. Supports digestive balance and immune function.</p><p>Shelf-stable — no refrigeration needed.</p>",
    variants: [
      { title: "30 Capsules", price: "29.99", sku: "PROB-30", inventory: 110, cost: "10.00" },
      { title: "60 Capsules", price: "52.99", sku: "PROB-60", inventory: 65, cost: "18.00" },
    ],
  },
  {
    title: "Magnesium Complex",
    productType: "Supplement",
    vendor: "NutriVital",
    descriptionHtml:
      "<p>Triple-form magnesium complex: glycinate, taurate, and malate. Optimized for sleep, muscle recovery, and stress relief. Gentle on the stomach.</p><p>400mg elemental magnesium per serving. 120 capsules.</p>",
    variants: [
      { title: "60 Capsules", price: "19.99", sku: "MAG-60", inventory: 180, cost: "6.00" },
      { title: "120 Capsules", price: "34.99", sku: "MAG-120", inventory: 100, cost: "10.00" },
    ],
  },
  {
    title: "Turmeric Curcumin",
    productType: "Supplement",
    vendor: "NutriVital",
    descriptionHtml:
      "<p>High-potency turmeric curcumin with BioPerine for 2000% better absorption. 1500mg turmeric with 95% curcuminoids per serving. Supports joint comfort and healthy inflammation response.</p>",
    variants: [
      { title: "60 Capsules", price: "27.99", sku: "TURM-60", inventory: 95, cost: "8.00" },
      { title: "120 Capsules", price: "49.99", sku: "TURM-120", inventory: 50, cost: "14.00" },
    ],
  },
  {
    title: "Pre-Workout Blend",
    productType: "Supplement",
    vendor: "NutriVital",
    descriptionHtml:
      "<p>Clean energy pre-workout with natural caffeine, beta-alanine, L-citrulline, and B-vitamins. No artificial colors or flavors. Watermelon flavor. Mixes instantly.</p><p>200mg caffeine from green tea extract. No crash, no jitters.</p>",
    variants: [
      { title: "30 Servings", price: "32.99", sku: "PRE-30", inventory: 70, cost: "11.00" },
      { title: "60 Servings", price: "57.99", sku: "PRE-60", inventory: 40, cost: "20.00" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Customer templates
// ---------------------------------------------------------------------------
const FIRST_NAMES = [
  "Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason",
  "Isabella", "William", "Mia", "James", "Charlotte", "Benjamin", "Amelia",
  "Lucas", "Harper", "Henry", "Evelyn", "Alexander", "Abigail", "Daniel",
  "Emily", "Michael", "Elizabeth", "Sebastian", "Sofia", "Jack", "Avery",
  "Owen", "Ella", "Aiden", "Scarlett", "Samuel", "Grace", "Ryan", "Lily",
  "Nathan", "Chloe", "Caleb", "Victoria", "Christian", "Riley", "Dylan",
  "Aria", "Isaac", "Zoey", "Andrew", "Nora", "Joshua",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
  "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark",
  "Ramirez", "Lewis", "Robinson",
];

const CITIES: Array<{ city: string; province: string; zip: string }> = [
  { city: "New York", province: "NY", zip: "10001" },
  { city: "Los Angeles", province: "CA", zip: "90001" },
  { city: "Chicago", province: "IL", zip: "60601" },
  { city: "Houston", province: "TX", zip: "77001" },
  { city: "Phoenix", province: "AZ", zip: "85001" },
  { city: "Philadelphia", province: "PA", zip: "19101" },
  { city: "San Antonio", province: "TX", zip: "78201" },
  { city: "San Diego", province: "CA", zip: "92101" },
  { city: "Dallas", province: "TX", zip: "75201" },
  { city: "Austin", province: "TX", zip: "73301" },
  { city: "Denver", province: "CO", zip: "80201" },
  { city: "Portland", province: "OR", zip: "97201" },
  { city: "Seattle", province: "WA", zip: "98101" },
  { city: "Nashville", province: "TN", zip: "37201" },
  { city: "Miami", province: "FL", zip: "33101" },
];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------
const CREATE_PRODUCT = `
  mutation productCreate($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
    productCreate(product: $product, media: $media) {
      product {
        id
        title
        variants(first: 10) {
          edges { node { id title sku inventoryItem { id } } }
        }
      }
      userErrors { field message }
    }
  }
`;

const UPDATE_VARIANT_PRICE = `
  mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id price }
      userErrors { field message }
    }
  }
`;

const UPDATE_INVENTORY_COST = `
  mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
    inventoryItemUpdate(id: $id, input: $input) {
      inventoryItem { id unitCost { amount } }
      userErrors { field message }
    }
  }
`;

const SET_INVENTORY_QUANTITIES = `
  mutation inventorySetOnHandQuantities($input: InventorySetOnHandQuantitiesInput!) {
    inventorySetOnHandQuantities(input: $input) {
      inventoryAdjustmentGroup { reason }
      userErrors { field message }
    }
  }
`;

const GET_LOCATIONS = `
  query { locations(first: 1) { edges { node { id name } } } }
`;

const CREATE_CUSTOMER = `
  mutation customerCreate($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer { id displayName email }
      userErrors { field message }
    }
  }
`;

const CREATE_DRAFT_ORDER = `
  mutation draftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder { id name }
      userErrors { field message }
    }
  }
`;

const COMPLETE_DRAFT_ORDER = `
  mutation draftOrderComplete($id: ID!) {
    draftOrderComplete(id: $id) {
      draftOrder { id order { id name createdAt } }
      userErrors { field message }
    }
  }
`;

const SEARCH_PRODUCTS = `
  query { products(first: 10) { edges { node { id title } } } }
`;

// ---------------------------------------------------------------------------
// Seed: Products
// ---------------------------------------------------------------------------
async function seedProducts(locationId: string) {
  console.log("\n=== Seeding Products ===");

  // Check for existing products
  const existing = await gql(SEARCH_PRODUCTS);
  if (existing.products.edges.length > 0) {
    console.log(
      `Found ${existing.products.edges.length} existing products. Checking if already seeded...`,
    );
    const titles = existing.products.edges.map((e: any) => e.node.title);
    if (titles.includes("Collagen Peptides")) {
      console.log("Products already seeded. Skipping.");
      // Return product IDs and variant info for order creation
      return await getExistingProductData();
    }
  }

  const productData: Array<{
    id: string;
    title: string;
    variants: Array<{ id: string; title: string; sku: string; price: string; inventoryItemId: string }>;
  }> = [];

  for (const product of PRODUCTS) {
    console.log(`  Creating: ${product.title}`);

    const data = await gql(CREATE_PRODUCT, {
      product: {
        title: product.title,
        productType: product.productType,
        vendor: product.vendor,
        descriptionHtml: product.descriptionHtml,
        status: "ACTIVE",
      },
    });

    if (data.productCreate.userErrors?.length > 0) {
      console.error(`  Error:`, data.productCreate.userErrors);
      continue;
    }

    const createdProduct = data.productCreate.product;
    const variantEdges = createdProduct.variants.edges;

    // Update variant prices and create additional variants if needed
    const variantUpdates = [];
    const createdVariants: typeof productData[0]["variants"] = [];

    // First variant already exists (default), update it
    if (variantEdges[0]) {
      variantUpdates.push({
        id: variantEdges[0].node.id,
        price: product.variants[0].price,
        sku: product.variants[0].sku,
        optionValues: [{ name: product.variants[0].title, optionName: "Title" }],
      });
      createdVariants.push({
        id: variantEdges[0].node.id,
        title: product.variants[0].title,
        sku: product.variants[0].sku,
        price: product.variants[0].price,
        inventoryItemId: variantEdges[0].node.inventoryItem.id,
      });
    }

    // Create additional variants
    for (let i = 1; i < product.variants.length; i++) {
      variantUpdates.push({
        price: product.variants[i].price,
        sku: product.variants[i].sku,
        optionValues: [{ name: product.variants[i].title, optionName: "Title" }],
      });
    }

    // Bulk update variants
    const variantData = await gql(UPDATE_VARIANT_PRICE, {
      productId: createdProduct.id,
      variants: variantUpdates,
    });

    if (variantData.productVariantsBulkUpdate?.productVariants) {
      // Re-fetch product to get all variant IDs including new ones
      await sleep(500);
    }

    // Re-fetch to get all variants with inventory item IDs
    const refetch = await gql(
      `query ($id: ID!) { product(id: $id) { id title variants(first: 10) { edges { node { id title sku price inventoryItem { id } } } } } }`,
      { id: createdProduct.id },
    );

    const allVariants = refetch.product.variants.edges.map((e: any) => ({
      id: e.node.id,
      title: e.node.title,
      sku: e.node.sku,
      price: e.node.price,
      inventoryItemId: e.node.inventoryItem.id,
    }));

    productData.push({
      id: createdProduct.id,
      title: createdProduct.title,
      variants: allVariants,
    });

    // Set unit costs and inventory for each variant
    for (let i = 0; i < allVariants.length && i < product.variants.length; i++) {
      const variant = allVariants[i];
      const spec = product.variants[i];

      // Set unit cost
      await gql(UPDATE_INVENTORY_COST, {
        id: variant.inventoryItemId,
        input: { cost: spec.cost },
      });

      // Set inventory quantity
      await gql(SET_INVENTORY_QUANTITIES, {
        input: {
          reason: "correction",
          setQuantities: [
            {
              inventoryItemId: variant.inventoryItemId,
              locationId,
              quantity: spec.inventory,
            },
          ],
        },
      });
    }

    console.log(`  ✓ ${product.title} — ${allVariants.length} variants`);
    await sleep(300);
  }

  return productData;
}

async function getExistingProductData() {
  const data = await gql(`
    query {
      products(first: 50) {
        edges {
          node {
            id title
            variants(first: 10) {
              edges {
                node { id title sku price inventoryItem { id } }
              }
            }
          }
        }
      }
    }
  `);

  return data.products.edges.map((e: any) => ({
    id: e.node.id,
    title: e.node.title,
    variants: e.node.variants.edges.map((v: any) => ({
      id: v.node.id,
      title: v.node.title,
      sku: v.node.sku,
      price: v.node.price,
      inventoryItemId: v.node.inventoryItem.id,
    })),
  }));
}

// ---------------------------------------------------------------------------
// Seed: Customers
// ---------------------------------------------------------------------------
async function seedCustomers(): Promise<
  Array<{ id: string; name: string; email: string; segment: string }>
> {
  console.log("\n=== Seeding Customers ===");

  // Check if already seeded
  const existingCheck = await gql(`
    query { customers(first: 5, query: "email:*@example.com") {
      edges { node { id } }
    } }
  `);
  if (existingCheck.customers.edges.length > 3) {
    console.log("Customers appear to be already seeded. Fetching existing...");
    const all = await gql(`
      query { customers(first: 250) {
        edges { node { id displayName email tags } }
      } }
    `);
    return all.customers.edges.map((e: any) => ({
      id: e.node.id,
      name: e.node.displayName,
      email: e.node.email,
      segment: e.node.tags?.[0] || "one-time",
    }));
  }

  const customers: Array<{ id: string; name: string; email: string; segment: string }> = [];

  // Segment definitions
  const segments: Array<{ tag: string; count: number }> = [
    { tag: "collagen-loyalist", count: 12 },
    { tag: "high-value", count: 18 },
    { tag: "bundle-buyer", count: 22 },
    { tag: "one-time", count: 55 },
    { tag: "lapsed", count: 28 },
    { tag: "recent-new", count: 22 },
  ];

  let nameIndex = 0;

  for (const segment of segments) {
    for (let i = 0; i < segment.count; i++) {
      const firstName = FIRST_NAMES[nameIndex % FIRST_NAMES.length];
      const lastName = LAST_NAMES[nameIndex % LAST_NAMES.length];
      // Add index to avoid duplicate emails
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${nameIndex}@example.com`;
      const location = randomPick(CITIES);
      nameIndex++;

      const data = await gql(CREATE_CUSTOMER, {
        input: {
          firstName,
          lastName,
          email,
          tags: [segment.tag],
          addresses: [
            {
              address1: `${randomInt(100, 9999)} Main St`,
              city: location.city,
              provinceCode: location.province,
              zip: location.zip,
              countryCode: "US",
            },
          ],
        },
      });

      if (data.customerCreate?.customer) {
        customers.push({
          id: data.customerCreate.customer.id,
          name: `${firstName} ${lastName}`,
          email,
          segment: segment.tag,
        });
      }

      // Batch throttle: pause every 10 customers
      if (nameIndex % 10 === 0) {
        console.log(`  Created ${nameIndex} customers...`);
        await sleep(500);
      }
    }
  }

  console.log(`  ✓ Created ${customers.length} customers`);
  return customers;
}

// ---------------------------------------------------------------------------
// Seed: Orders (via draft orders)
// ---------------------------------------------------------------------------
async function seedOrders(
  products: Awaited<ReturnType<typeof seedProducts>>,
  customers: Awaited<ReturnType<typeof seedCustomers>>,
) {
  console.log("\n=== Seeding Orders ===");

  // Check existing order count
  const orderCountData = await gql(`query { ordersCount { count } }`);
  const existingOrderCount = orderCountData.ordersCount.count;
  if (existingOrderCount > 30) {
    console.log(`Found ${existingOrderCount} existing orders. Skipping seed.`);
    return;
  }

  const TARGET_ORDERS = 200;

  // Product lookup by title
  const productMap = new Map(products.map((p) => [p.title, p]));

  // Helper: get variant for an order line
  function getVariant(productTitle: string) {
    const product = productMap.get(productTitle);
    if (!product || product.variants.length === 0) return null;
    return randomPick(product.variants);
  }

  // Distribution weights for product selection
  const productWeights: Array<{ title: string; weight: number }> = [
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

  function weightedProductPick(): string {
    const totalWeight = productWeights.reduce((s, p) => s + p.weight, 0);
    let r = Math.random() * totalWeight;
    for (const p of productWeights) {
      r -= p.weight;
      if (r <= 0) return p.title;
    }
    return productWeights[0].title;
  }

  // Customer segment → order behavior
  const segmentBehavior: Record<string, { orderCount: number; products?: string[] }> = {
    "collagen-loyalist": { orderCount: 3, products: ["Collagen Peptides"] },
    "high-value": { orderCount: 4 },
    "bundle-buyer": { orderCount: 2, products: ["Protein Bars - Variety Pack", "Electrolyte Mix"] },
    "one-time": { orderCount: 1 },
    "lapsed": { orderCount: 1 },
    "recent-new": { orderCount: 1 },
  };

  let orderCount = 0;

  for (const customer of customers) {
    if (orderCount >= TARGET_ORDERS) break;

    const behavior = segmentBehavior[customer.segment] || { orderCount: 1 };
    const numOrders = Math.min(behavior.orderCount, TARGET_ORDERS - orderCount);

    for (let o = 0; o < numOrders; o++) {
      // Build line items
      const lineItems: Array<{ variantId: string; quantity: number }> = [];

      if (behavior.products) {
        // Segment-specific products
        for (const productTitle of behavior.products) {
          const variant = getVariant(productTitle);
          if (variant) {
            lineItems.push({ variantId: variant.id, quantity: randomInt(1, 2) });
          }
        }
      }

      // Add 0-2 random products
      const extraCount = randomInt(0, 2);
      for (let e = 0; e < extraCount; e++) {
        const title = weightedProductPick();
        const variant = getVariant(title);
        if (variant && !lineItems.find((li) => li.variantId === variant.id)) {
          lineItems.push({ variantId: variant.id, quantity: 1 });
        }
      }

      if (lineItems.length === 0) continue;

      // Date: spread over last 45 days, recent-new within 14 days, lapsed 45+ days
      let daysAgo: number;
      if (customer.segment === "recent-new") {
        daysAgo = randomInt(1, 14);
      } else if (customer.segment === "lapsed") {
        daysAgo = randomInt(45, 60);
      } else {
        // More recent orders weighted higher (upward trend)
        daysAgo = Math.floor(Math.pow(Math.random(), 0.7) * 45);
      }

      // For Vitamin D, spike in last 10 days
      if (lineItems.some((li) => {
        const vitDProduct = productMap.get("Vitamin D Drops");
        return vitDProduct?.variants.some((v) => v.id === li.variantId);
      })) {
        daysAgo = Math.min(daysAgo, randomInt(1, 10));
      }

      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - daysAgo);

      // Create draft order
      try {
        const draftData = await gql(CREATE_DRAFT_ORDER, {
          input: {
            customerId: customer.id,
            lineItems,
            note: `Seed order — segment: ${customer.segment}`,
          },
        });

        if (draftData.draftOrderCreate?.draftOrder?.id) {
          // Complete the draft order
          const completeData = await gql(COMPLETE_DRAFT_ORDER, {
            id: draftData.draftOrderCreate.draftOrder.id,
          });

          if (completeData.draftOrderComplete?.draftOrder?.order) {
            orderCount++;
          }
        }
      } catch (err: any) {
        console.error(`  Order creation error: ${err.message}`);
      }

      // Throttle: pause every 5 orders
      if (orderCount % 5 === 0) {
        console.log(`  Created ${orderCount} orders...`);
        await sleep(1500);
      } else {
        await sleep(300);
      }
    }
  }

  console.log(`  ✓ Created ${orderCount} orders total`);
}

// ---------------------------------------------------------------------------
// Seed: Collections
// ---------------------------------------------------------------------------
async function seedCollections(products: Awaited<ReturnType<typeof seedProducts>>) {
  console.log("\n=== Seeding Collections ===");

  const productMap = new Map(products.map((p) => [p.title, p.id]));

  const collections = [
    {
      title: "Bestsellers",
      products: ["Daily Greens Powder", "Collagen Peptides", "Protein Bars - Variety Pack", "Vitamin D Drops"],
    },
    {
      title: "Daily Essentials",
      products: ["Vitamin D Drops", "Omega-3 Fish Oil", "Probiotic Capsules", "Magnesium Complex"],
    },
    {
      title: "Performance",
      products: ["Pre-Workout Blend", "Electrolyte Mix", "Protein Bars - Variety Pack"],
    },
  ];

  for (const col of collections) {
    const productIds = col.products
      .map((t) => productMap.get(t))
      .filter(Boolean) as string[];

    const data = await gql(
      `mutation collectionCreate($input: CollectionInput!) {
        collectionCreate(input: $input) {
          collection { id title }
          userErrors { field message }
        }
      }`,
      {
        input: {
          title: col.title,
          collects: productIds.map((id) => ({ productId: id })),
        },
      },
    );

    if (data.collectionCreate?.collection) {
      console.log(`  ✓ ${col.title}`);
    } else {
      console.log(`  ⚠ ${col.title}:`, data.collectionCreate?.userErrors);
    }
    await sleep(300);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\nSeeding store: ${STORE}`);
  console.log(`API version: ${API_VERSION}\n`);

  // Get location ID
  const locationData = await gql(GET_LOCATIONS);
  const locationId = locationData.locations.edges[0]?.node?.id;
  if (!locationId) {
    console.error("No location found. Is the store set up?");
    process.exit(1);
  }
  console.log(`Location: ${locationData.locations.edges[0].node.name} (${locationId})`);

  // Seed in order
  const products = await seedProducts(locationId);
  const customers = await seedCustomers();
  await seedOrders(products, customers);
  await seedCollections(products);

  console.log("\n=== Seeding Complete ===\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
