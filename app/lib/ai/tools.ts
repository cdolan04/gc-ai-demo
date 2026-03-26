import { tool, zodSchema } from "ai";
import { z } from "zod";
import {
  GET_PRODUCTS,
  GET_ORDERS,
  GET_CUSTOMERS,
  GET_INVENTORY_ITEMS,
  GET_PRODUCTS_COUNT,
  CREATE_PAGE,
  UPDATE_PAGE,
  CREATE_DISCOUNT_CODE,
  UPDATE_PRODUCT,
} from "./shopify-queries";
import type {
  ShopifyEdge,
  OrderNode,
  ProductNode,
  CustomerNode,
  VariantNode,
  LineItemNode,
  GraphQLError,
  Insight,
  LowStockItem,
  ProductMargin,
} from "./shopify-types";

// Type for the Shopify admin GraphQL client
type AdminClient = {
  graphql: (query: string, options?: { variables: Record<string, unknown> }) => Promise<Response>;
};

// Helper to execute GraphQL and parse response
async function gql(admin: AdminClient, query: string, variables: Record<string, unknown> = {}) {
  const response = await admin.graphql(query, { variables });
  const json = await response.json();
  if (json.errors && json.errors.length > 0) {
    const msg = json.errors.map((e: GraphQLError) => e.message).join("; ");
    throw new Error(`Shopify GraphQL error: ${msg}`);
  }
  if (!json.data) {
    throw new Error("Shopify returned no data");
  }
  return json.data;
}

export function createTools(admin: AdminClient) {
  return {
    getStoreSummary: tool({
      description:
        "Store KPIs: revenue, orders, AOV, low-stock alerts, trends, and insights. Default starting point.",
      inputSchema: zodSchema(
        z.object({
          daysBack: z
            .number()
            .optional()
            .describe("Days to look back. Defaults to 7."),
        }),
      ),
      execute: async ({ daysBack = 7 }: { daysBack?: number }) => {
        const since = new Date();
        since.setDate(since.getDate() - daysBack);
        const sinceStr = since.toISOString();

        // Prior period for trend comparison
        const priorEnd = new Date(since);
        const priorStart = new Date(priorEnd);
        priorStart.setDate(priorStart.getDate() - daysBack);
        const priorStartStr = priorStart.toISOString();
        const priorEndStr = priorEnd.toISOString();

        const [productsCount, orders, priorOrders, products] = await Promise.all([
          gql(admin, GET_PRODUCTS_COUNT),
          gql(admin, GET_ORDERS, {
            query: `processed_at:>='${sinceStr}'`,
            first: 250,
          }),
          gql(admin, GET_ORDERS, {
            query: `processed_at:>='${priorStartStr}' AND processed_at:<'${priorEndStr}'`,
            first: 250,
          }),
          gql(admin, GET_PRODUCTS, {
            query: "",
            first: 50,
          }),
        ]);

        const orderEdges: ShopifyEdge<OrderNode>[] = orders.orders.edges;
        const totalRevenue = orderEdges.reduce(
          (sum: number, { node }: ShopifyEdge<OrderNode>) =>
            sum + parseFloat(node.totalPriceSet.shopMoney.amount),
          0,
        );
        const orderCount = orderEdges.length;
        const aov = orderCount > 0 ? totalRevenue / orderCount : 0;

        // Prior period revenue
        const priorOrderEdges: ShopifyEdge<OrderNode>[] = priorOrders.orders.edges;
        const priorRevenue = priorOrderEdges.reduce(
          (sum: number, { node }: ShopifyEdge<OrderNode>) =>
            sum + parseFloat(node.totalPriceSet.shopMoney.amount),
          0,
        );

        // Revenue trend
        const revenueTrendPercent =
          priorRevenue > 0
            ? Math.round(((totalRevenue - priorRevenue) / priorRevenue) * 1000) / 10
            : 0;

        // Products analysis
        const productEdges: ShopifyEdge<ProductNode>[] = products.products.edges;
        const lowStock: LowStockItem[] = productEdges
          .filter(({ node }: ShopifyEdge<ProductNode>) => node.totalInventory < 10 && node.totalInventory >= 0)
          .map(({ node }: ShopifyEdge<ProductNode>) => ({
            title: node.title,
            inventory: node.totalInventory,
          }));

        // Compute product margins for hidden gem detection
        const productMargins: ProductMargin[] = productEdges.map(({ node }: ShopifyEdge<ProductNode>) => {
          const variant = node.variants?.edges?.[0]?.node;
          const price = variant ? parseFloat(variant.price) : 0;
          const cost = variant?.inventoryItem?.unitCost
            ? parseFloat(variant.inventoryItem.unitCost.amount)
            : 0;
          const margin = price > 0 && cost > 0 ? ((price - cost) / price) * 100 : 0;
          return { title: node.title, margin, inventory: node.totalInventory };
        });

        // Count order volume per product from current period
        const productVolume: Record<string, number> = {};
        for (const { node } of orderEdges as ShopifyEdge<OrderNode>[]) {
          for (const { node: li } of (node.lineItems?.edges || []) as ShopifyEdge<LineItemNode>[]) {
            productVolume[li.name] = (productVolume[li.name] || 0) + li.quantity;
          }
        }

        // Build insights (structured fields power rich tile visuals in KPIDashboard)
        const insights: Insight[] = [];

        // 1. Revenue trend
        if (priorRevenue > 0) {
          insights.push({
            type: "trend",
            label: "Revenue Trend",
            value: `${revenueTrendPercent > 0 ? "+" : ""}${revenueTrendPercent.toFixed(1)}%`,
            detail: `vs prior ${daysBack} days ($${Math.round(priorRevenue).toLocaleString()} → $${Math.round(totalRevenue).toLocaleString()})`,
            sentiment: revenueTrendPercent >= 0 ? "positive" : "negative",
            // Structured fields for TrendTile
            percentChange: revenueTrendPercent,
            currentValue: Math.round(totalRevenue * 100) / 100,
            previousValue: Math.round(priorRevenue * 100) / 100,
            periodLabel: `vs prior ${daysBack} days`,
          });
        }

        // 2. Low stock alerts with velocity context
        if (lowStock.length > 0) {
          // Pick the most critical item (lowest stock) for the structured tile
          const criticalItem = lowStock.reduce(
            (min: LowStockItem, ls: LowStockItem) => (ls.inventory < min.inventory ? ls : min),
            lowStock[0],
          );
          const critVol = productVolume[criticalItem.title] || 0;
          const critDailyRate = critVol / daysBack;
          const critDaysLeft = critDailyRate > 0 ? Math.round(criticalItem.inventory / critDailyRate) : null;

          const lowStockNames = lowStock.map((ls: { title: string; inventory: number }) => {
            const vol = productVolume[ls.title] || 0;
            const dailyRate = vol / daysBack;
            const daysLeft = dailyRate > 0 ? Math.round(ls.inventory / dailyRate) : null;
            return daysLeft !== null
              ? `${ls.title} (~${daysLeft}d left)`
              : `${ls.title} (${ls.inventory} units)`;
          });
          insights.push({
            type: "inventory",
            label: "Stock Alert",
            value: `${lowStock.length} item${lowStock.length > 1 ? "s" : ""} critically low`,
            detail: lowStockNames.join(", "),
            sentiment: "warning",
            // Structured fields for AlertTile
            productName: criticalItem.title,
            currentStock: criticalItem.inventory,
            daysRemaining: critDaysLeft,
            dailyVelocity: Math.round(critDailyRate * 100) / 100,
          });
        }

        // 3. Opportunity: high margin (top quartile) + low volume rank
        const volumeRanked = Object.entries(productVolume).sort((a, b) => b[1] - a[1]);
        const allMargins = productMargins.map((p: { margin: number }) => p.margin).filter((m: number) => m > 0).sort((a: number, b: number) => b - a);
        const marginThreshold = allMargins[Math.floor(allMargins.length * 0.25)] || 50;
        const highMarginProducts = productMargins.filter((p: { margin: number }) => p.margin >= marginThreshold);
        for (const hm of highMarginProducts) {
          const volumeRank = volumeRanked.findIndex(([name]) => name === hm.title);
          const totalRanked = volumeRanked.length;
          // Opportunity if in bottom half by volume but top quartile by margin
          if (volumeRank >= Math.floor(totalRanked / 2) && volumeRank >= 0) {
            insights.push({
              type: "opportunity",
              label: "Hidden Gem",
              value: hm.title,
              detail: `${hm.margin.toFixed(0)}% margin but only #${volumeRank + 1} by volume — undermarketed`,
              sentiment: "info",
              // Structured fields for OpportunityTile
              productName: hm.title,
              margin: Math.round(hm.margin),
              volumeRank: volumeRank + 1,
              totalProducts: totalRanked,
            });
            break; // only show top hidden gem
          }
        }

        return {
          totalProducts: productsCount.productsCount.count,
          periodDays: daysBack,
          orderCount,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          averageOrderValue: Math.round(aov * 100) / 100,
          lowStockAlerts: lowStock,
          priorPeriodRevenue: Math.round(priorRevenue * 100) / 100,
          revenueTrendPercent,
          insights,
        };
      },
    }),

    queryProducts: tool({
      description:
        "Search products with pricing, inventory, margin, and images. Use before generating landing pages.",
      inputSchema: zodSchema(
        z.object({
          searchQuery: z
            .string()
            .optional()
            .describe("Shopify search query. Empty = all products."),
          first: z
            .number()
            .optional()
            .describe("Count to return. Defaults to 25."),
        }),
      ),
      execute: async ({ searchQuery = "", first = 25 }: { searchQuery?: string; first?: number }) => {
        const data = await gql(admin, GET_PRODUCTS, {
          query: searchQuery,
          first,
        });

        return data.products.edges.map(({ node }: ShopifyEdge<ProductNode>) => ({
          id: node.id,
          title: node.title,
          handle: node.handle,
          status: node.status,
          productType: node.productType,
          totalInventory: node.totalInventory,
          descriptionHtml: node.descriptionHtml,
          priceRange: {
            min: node.priceRangeV2.minVariantPrice.amount,
            max: node.priceRangeV2.maxVariantPrice.amount,
            currency: node.priceRangeV2.minVariantPrice.currencyCode,
          },
          image: node.featuredMedia?.preview?.image?.url || null,
          imageAlt: node.featuredMedia?.preview?.image?.altText || null,
          variants: node.variants.edges.map(({ node: v }: ShopifyEdge<ProductNode["variants"]["edges"][number]["node"]>) => ({
            id: v.id,
            title: v.title,
            sku: v.sku,
            price: v.price,
            inventoryQuantity: v.inventoryQuantity,
            unitCost: v.inventoryItem?.unitCost?.amount || null,
            margin: v.inventoryItem?.unitCost
              ? Math.round(
                  ((parseFloat(v.price) -
                    parseFloat(v.inventoryItem.unitCost.amount)) /
                    parseFloat(v.price)) *
                    10000,
                ) / 100
              : null,
          })),
        }));
      },
    }),

    queryOrders: tool({
      description:
        "Query orders with aggregation. Use aggregateBy for analytics (day=chart, product=ranked table, customer=top spenders). Omit only for raw order lists.",
      inputSchema: zodSchema(
        z.object({
          searchQuery: z
            .string()
            .optional()
            .describe("Order search query. Use processed_at for dates."),
          aggregateBy: z
            .enum(["none", "day", "product", "customer"])
            .optional()
            .describe("Aggregation mode. Defaults to none."),
        }),
      ),
      execute: async ({ searchQuery = "", aggregateBy = "none" }: { searchQuery?: string; aggregateBy?: string }) => {
        const data = await gql(admin, GET_ORDERS, {
          query: searchQuery,
          first: 250,
        });

        const orders = data.orders.edges.map(({ node }: ShopifyEdge<OrderNode>) => ({
          id: node.id,
          name: node.name,
          createdAt: node.processedAt || node.createdAt,
          financialStatus: node.displayFinancialStatus,
          fulfillmentStatus: node.displayFulfillmentStatus,
          total: parseFloat(node.totalPriceSet.shopMoney.amount),
          subtotal: parseFloat(node.subtotalPriceSet.shopMoney.amount),
          currency: node.totalPriceSet.shopMoney.currencyCode,
          customer: node.customer
            ? {
                id: node.customer.id,
                name: node.customer.displayName,
                email: node.customer.email,
              }
            : null,
          lineItems: node.lineItems.edges.map(({ node: li }: ShopifyEdge<LineItemNode>) => ({
            name: li.name,
            quantity: li.quantity,
            sku: li.sku,
            unitPrice: parseFloat(li.originalUnitPriceSet.shopMoney.amount),
          })),
          shippingCity: node.shippingAddress?.city || null,
          shippingProvince: node.shippingAddress?.provinceCode || null,
        }));

        if (aggregateBy === "day") {
          const byDay: Record<string, { date: string; revenue: number; orderCount: number }> = {};
          for (const order of orders) {
            const day = order.createdAt.split("T")[0];
            if (!byDay[day]) byDay[day] = { date: day, revenue: 0, orderCount: 0 };
            byDay[day].revenue += order.total;
            byDay[day].orderCount += 1;
          }
          const aggregated = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
          aggregated.forEach((d) => (d.revenue = Math.round(d.revenue * 100) / 100));
          return { aggregation: "day", data: aggregated, totalOrders: orders.length };
        }

        if (aggregateBy === "product") {
          const byProduct: Record<string, { name: string; revenue: number; unitsSold: number; orderCount: number }> = {};
          for (const order of orders) {
            for (const li of order.lineItems) {
              if (!byProduct[li.name])
                byProduct[li.name] = { name: li.name, revenue: 0, unitsSold: 0, orderCount: 0 };
              byProduct[li.name].revenue += li.unitPrice * li.quantity;
              byProduct[li.name].unitsSold += li.quantity;
              byProduct[li.name].orderCount += 1;
            }
          }
          const aggregated = Object.values(byProduct).sort((a, b) => b.revenue - a.revenue);
          aggregated.forEach((p) => (p.revenue = Math.round(p.revenue * 100) / 100));
          return { aggregation: "product", data: aggregated, totalOrders: orders.length };
        }

        if (aggregateBy === "customer") {
          const byCustomer: Record<string, { name: string; email: string | null; revenue: number; orderCount: number }> = {};
          for (const order of orders) {
            const key = order.customer?.id || "guest";
            if (!byCustomer[key])
              byCustomer[key] = {
                name: order.customer?.name || "Guest",
                email: order.customer?.email || null,
                revenue: 0,
                orderCount: 0,
              };
            byCustomer[key].revenue += order.total;
            byCustomer[key].orderCount += 1;
          }
          const aggregated = Object.values(byCustomer).sort((a, b) => b.revenue - a.revenue);
          aggregated.forEach((c) => (c.revenue = Math.round(c.revenue * 100) / 100));
          return { aggregation: "customer", data: aggregated, totalOrders: orders.length };
        }

        return { aggregation: "none", data: orders, totalOrders: orders.length };
      },
    }),

    queryCustomers: tool({
      description:
        "Search customers with order count, lifetime spend, and address. Use for segmentation.",
      inputSchema: zodSchema(
        z.object({
          searchQuery: z
            .string()
            .optional()
            .describe("Customer search query."),
          first: z
            .number()
            .optional()
            .describe("Count. Defaults to 25."),
        }),
      ),
      execute: async ({ searchQuery = "", first = 25 }: { searchQuery?: string; first?: number }) => {
        const data = await gql(admin, GET_CUSTOMERS, {
          query: searchQuery,
          first,
        });

        return data.customers.edges.map(({ node }: ShopifyEdge<CustomerNode>) => ({
          id: node.id,
          name: node.displayName,
          email: node.email,
          orderCount: parseInt(node.numberOfOrders, 10),
          totalSpent: parseFloat(node.amountSpent.amount),
          city: node.defaultAddress?.city || null,
          tags: node.tags,
        }));
      },
    }),

    queryInventory: tool({
      description:
        "Inventory levels by variant and location with available/committed quantities.",
      inputSchema: zodSchema(
        z.object({
          first: z
            .number()
            .optional()
            .describe("Variants to check. Defaults to 50."),
        }),
      ),
      execute: async ({ first = 50 }: { first?: number }) => {
        const data = await gql(admin, GET_INVENTORY_ITEMS, { first });

        return data.productVariants.edges.map(({ node }: ShopifyEdge<VariantNode>) => ({
          variantId: node.id,
          variantTitle: node.title,
          sku: node.sku,
          inventoryQuantity: node.inventoryQuantity,
          productId: node.product.id,
          productTitle: node.product.title,
          unitCost: node.inventoryItem?.unitCost?.amount || null,
          locations: node.inventoryItem.inventoryLevels.edges.map(
            ({ node: level }: ShopifyEdge<{ location: { name: string }; quantities: Array<{ name: string; quantity: number }> }>) => ({
              locationName: level.location.name,
              quantities: level.quantities,
            }),
          ),
        }));
      },
    }),

    compareProducts: tool({
      description:
        "Side-by-side product comparison on margin, revenue, and volume. Use to highlight undermarketed products. Provide data from prior queries.",
      inputSchema: zodSchema(
        z.object({
          products: z
            .array(
              z.object({
                title: z.string(),
                price: z.string(),
                margin: z.number().describe("Margin %"),
                revenue: z.number(),
                unitsSold: z.number(),
                reorderRate: z.number().optional(),
                image: z.string().optional(),
              }),
            )
            .describe("Products to compare"),
          insight: z.string().describe("Your analytical insight"),
          suggestedAction: z.string().optional().describe("Suggested next action"),
        }),
      ),
      execute: async (input: {
        products: Array<{
          title: string;
          price: string;
          margin: number;
          revenue: number;
          unitsSold: number;
          reorderRate?: number;
          image?: string;
        }>;
        insight: string;
        suggestedAction?: string;
      }) => {
        return {
          status: "comparison",
          products: input.products,
          insight: input.insight,
          suggestedAction: input.suggestedAction,
        };
      },
    }),

    // --- Write Tools (preview-first) ---

    generateLiquidPage: tool({
      description:
        "Generate a landing page. Returns preview — not published until user confirms. Use real product data from prior queries.",
      inputSchema: zodSchema(
        z.object({
          title: z.string().describe("Page title"),
          productTitle: z.string().describe("Product name"),
          productPrice: z.string().describe("Price"),
          productDescription: z.string().describe("Description/selling points"),
          productImageUrl: z.string().optional().describe("Shopify CDN image URL"),
          discountCode: z.string().optional().describe("Discount code to feature"),
          htmlContent: z.string().describe("Concise HTML landing page with inline styles. Hero + 3 benefits + CTA. Keep under 2000 chars."),
        }),
      ),
      execute: async (input: {
        title: string;
        productTitle: string;
        productPrice: string;
        productDescription: string;
        productImageUrl?: string;
        discountCode?: string;
        htmlContent: string;
      }) => {
        return {
          status: "preview",
          title: input.title,
          productTitle: input.productTitle,
          productPrice: input.productPrice,
          productDescription: input.productDescription,
          productImageUrl: input.productImageUrl,
          discountCode: input.discountCode,
          htmlContent: input.htmlContent,
          message: "Here's a preview of the landing page. Click 'Publish' to create it in your store.",
        };
      },
    }),

    createDiscountCode: tool({
      description:
        "Create a discount code. Returns preview — not created until user confirms.",
      inputSchema: zodSchema(
        z.object({
          code: z.string().describe("Discount code"),
          discountType: z.enum(["percentage", "fixed_amount"]).describe("Type"),
          value: z.number().describe("Value (percentage or dollar amount)"),
          title: z.string().describe("Internal title"),
          appliesTo: z.string().optional().describe("What it applies to"),
          expiresAt: z.string().optional().describe("ISO expiry date. Must be future."),
        }),
      ),
      execute: async (input: {
        code: string;
        discountType: "percentage" | "fixed_amount";
        value: number;
        title: string;
        appliesTo?: string;
        expiresAt?: string;
      }) => {
        return {
          status: "preview",
          code: input.code,
          discountType: input.discountType,
          value: input.value,
          title: input.title,
          appliesTo: input.appliesTo || "All products",
          expiresAt: input.expiresAt || null,
          message: `Here's the discount code I'd create. Click 'Confirm' to activate it.`,
        };
      },
    }),

    updateProductCopy: tool({
      description:
        "Update product title/description. Returns before/after preview — not applied until user confirms.",
      inputSchema: zodSchema(
        z.object({
          productId: z.string().describe("Shopify product GID"),
          currentTitle: z.string().describe("Current title"),
          newTitle: z.string().optional().describe("New title"),
          currentDescription: z.string().describe("Current description HTML"),
          newDescription: z.string().optional().describe("New description HTML"),
        }),
      ),
      execute: async (input: {
        productId: string;
        currentTitle: string;
        newTitle?: string;
        currentDescription: string;
        newDescription?: string;
      }) => {
        return {
          status: "preview",
          productId: input.productId,
          before: {
            title: input.currentTitle,
            description: input.currentDescription,
          },
          after: {
            title: input.newTitle || input.currentTitle,
            description: input.newDescription || input.currentDescription,
          },
          message: "Here's the proposed update. Click 'Confirm' to apply the changes.",
        };
      },
    }),
    // --- Klaviyo Tools (preview-first) ---

    createKlaviyoAudience: tool({
      description:
        "Create email audience in Klaviyo from customer emails. Query customers first, then pass emails here. Preview — not created until confirmed.",
      inputSchema: zodSchema(
        z.object({
          audienceName: z.string().describe("Audience name"),
          description: z.string().describe("How this audience was selected"),
          customerEmails: z.array(z.string()).describe("Customer emails"),
        }),
      ),
      execute: async (input: {
        audienceName: string;
        description: string;
        customerEmails: string[];
      }) => {
        return {
          status: "preview",
          type: "audience",
          audienceName: input.audienceName,
          description: input.description,
          customerCount: input.customerEmails.length,
          customerEmails: input.customerEmails,
          message: "Here's the audience I'd create in Klaviyo. Confirm to proceed.",
        };
      },
    }),

    sendKlaviyoCampaign: tool({
      description:
        "Send email campaign via Klaviyo. Compose HTML email with subject and body. Preview — not sent until confirmed.",
      inputSchema: zodSchema(
        z.object({
          campaignName: z.string().describe("Campaign name"),
          audienceName: z.string().describe("Target audience name"),
          customerEmails: z.array(z.string()).describe("Target emails"),
          subject: z.string().describe("Subject line"),
          previewText: z.string().describe("Inbox preview text"),
          htmlBody: z.string().describe("HTML email body, inline styles, 600px max-width."),
          discountCode: z.string().optional().describe("Discount code to feature"),
          landingPageUrl: z.string().optional().describe("Landing page URL to link"),
        }),
      ),
      execute: async (input: {
        campaignName: string;
        audienceName: string;
        customerEmails: string[];
        subject: string;
        previewText: string;
        htmlBody: string;
        discountCode?: string;
        landingPageUrl?: string;
      }) => {
        return {
          status: "preview",
          type: "campaign",
          campaignName: input.campaignName,
          audienceName: input.audienceName,
          recipientCount: input.customerEmails.length,
          subject: input.subject,
          previewText: input.previewText,
          htmlBody: input.htmlBody,
          discountCode: input.discountCode || null,
          landingPageUrl: input.landingPageUrl || null,
          customerEmails: input.customerEmails,
          message: "Here's the email campaign. Confirm to create it in Klaviyo.",
        };
      },
    }),
  };
}

// --- Confirmation executors (called when user clicks confirm) ---

export async function confirmPublishPage(
  admin: AdminClient,
  { title, htmlContent }: { title: string; htmlContent: string },
) {
  const createData = await gql(admin, CREATE_PAGE, {
    page: { title, body: htmlContent },
  });

  const page = createData.pageCreate.page;
  if (createData.pageCreate.userErrors?.length > 0) {
    return { success: false, errors: createData.pageCreate.userErrors };
  }

  await gql(admin, UPDATE_PAGE, {
    id: page.id,
    page: { isPublished: true },
  });

  return { success: true, pageId: page.id, handle: page.handle, title: page.title };
}

export async function confirmCreateDiscount(
  admin: AdminClient,
  {
    code,
    discountType,
    value,
    title,
    expiresAt,
  }: {
    code: string;
    discountType: "percentage" | "fixed_amount";
    value: number;
    title: string;
    expiresAt?: string | null;
  },
) {
  const customerGets =
    discountType === "percentage"
      ? {
          value: { percentage: value / 100 },
          items: { all: true },
        }
      : {
          value: { discountAmount: { amount: value, appliesOnEachItem: false } },
          items: { all: true },
        };

  const now = new Date();
  // Ensure endsAt is in the future; discard past dates to avoid Shopify validation error
  let validEndsAt: string | null = null;
  if (expiresAt) {
    const endsDate = new Date(expiresAt);
    if (endsDate > now) {
      validEndsAt = endsDate.toISOString();
    }
  }

  const data = await gql(admin, CREATE_DISCOUNT_CODE, {
    basicCodeDiscount: {
      title,
      code,
      startsAt: now.toISOString(),
      endsAt: validEndsAt,
      customerSelection: { all: true },
      customerGets,
    },
  });

  if (data.discountCodeBasicCreate.userErrors?.length > 0) {
    return { success: false, errors: data.discountCodeBasicCreate.userErrors };
  }

  return {
    success: true,
    discountId: data.discountCodeBasicCreate.codeDiscountNode.id,
    code,
  };
}

export async function confirmUpdateProduct(
  admin: AdminClient,
  {
    productId,
    title,
    descriptionHtml,
  }: { productId: string; title?: string; descriptionHtml?: string },
) {
  const input: Record<string, string> = { id: productId };
  if (title) input.title = title;
  if (descriptionHtml) input.descriptionHtml = descriptionHtml;

  const data = await gql(admin, UPDATE_PRODUCT, { input });

  if (data.productUpdate.userErrors?.length > 0) {
    return { success: false, errors: data.productUpdate.userErrors };
  }

  return {
    success: true,
    product: data.productUpdate.product,
  };
}
