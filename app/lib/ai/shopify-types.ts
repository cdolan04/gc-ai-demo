/**
 * TypeScript interfaces for Shopify GraphQL Admin API responses.
 * Derived from the queries in shopify-queries.ts.
 */

export interface ShopifyEdge<T> {
  node: T;
}

export interface ShopifyMoney {
  amount: string;
  currencyCode: string;
}

export interface ShopifyMoneySet {
  shopMoney: ShopifyMoney;
}

export interface LineItemNode {
  name: string;
  quantity: number;
  sku: string;
  originalUnitPriceSet: ShopifyMoneySet;
}

export interface OrderNode {
  id: string;
  name: string;
  processedAt: string;
  createdAt: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  totalPriceSet: ShopifyMoneySet;
  subtotalPriceSet: ShopifyMoneySet;
  customer: { id: string; displayName: string; email: string } | null;
  lineItems: { edges: ShopifyEdge<LineItemNode>[] };
  shippingAddress: { city?: string; provinceCode?: string; country?: string } | null;
}

export interface VariantNode {
  id: string;
  title: string;
  sku: string;
  price: string;
  inventoryQuantity: number;
  inventoryItem: {
    unitCost: ShopifyMoney | null;
    inventoryLevels: {
      edges: ShopifyEdge<InventoryLevelNode>[];
    };
  };
  product: { id: string; title: string };
}

export interface InventoryLevelNode {
  location: { name: string };
  quantities: Array<{ name: string; quantity: number }>;
}

export interface ProductNode {
  id: string;
  title: string;
  handle: string;
  status: string;
  productType: string;
  totalInventory: number;
  descriptionHtml: string;
  priceRangeV2: {
    minVariantPrice: ShopifyMoney;
    maxVariantPrice: ShopifyMoney;
  };
  featuredMedia: {
    preview: {
      image: { url: string; altText: string | null } | null;
    } | null;
  } | null;
  variants: {
    edges: ShopifyEdge<{
      id: string;
      title: string;
      sku: string;
      price: string;
      inventoryQuantity: number;
      inventoryItem: {
        unitCost: ShopifyMoney | null;
      };
    }>[];
  };
}

export interface CustomerNode {
  id: string;
  displayName: string;
  email: string;
  phone: string | null;
  numberOfOrders: string;
  amountSpent: ShopifyMoney;
  createdAt: string;
  defaultAddress: {
    city?: string;
    provinceCode?: string;
    country?: string;
  } | null;
  tags: string[];
}

export interface GraphQLError {
  message: string;
}

export interface Insight {
  type: "trend" | "inventory" | "opportunity";
  label: string;
  value: string;
  detail: string;
  sentiment: "positive" | "negative" | "warning" | "info";
  // Trend fields
  percentChange?: number;
  currentValue?: number;
  previousValue?: number;
  periodLabel?: string;
  // Inventory fields
  productName?: string;
  currentStock?: number;
  daysRemaining?: number | null;
  dailyVelocity?: number;
  // Opportunity fields
  margin?: number;
  volumeRank?: number;
  totalProducts?: number;
}

export interface LowStockItem {
  title: string;
  inventory: number;
}

export interface ProductMargin {
  title: string;
  margin: number;
  inventory: number;
}
