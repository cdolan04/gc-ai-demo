import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { useRef, useCallback } from "react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { ChatInterface } from "../components/chat/ChatInterface";
import { KPIStrip } from "../components/chat/KPIStrip";
import {
  GET_PRODUCTS,
  GET_ORDERS,
} from "../lib/ai/shopify-queries";
import type { ShopifyEdge, OrderNode, ProductNode } from "../lib/ai/shopify-types";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const now = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString();

  // Prior 7-day window for WoW comparison
  const priorSince = new Date(now);
  priorSince.setDate(priorSince.getDate() - 14);
  const priorSinceStr = priorSince.toISOString();

  try {
    const [ordersRes, priorOrdersRes, productsRes] = await Promise.all([
      admin
        .graphql(GET_ORDERS, {
          variables: {
            query: `processed_at:>='${sinceStr}'`,
            first: 250,
          },
        })
        .then((r) => r.json()),
      admin
        .graphql(GET_ORDERS, {
          variables: {
            query: `processed_at:>='${priorSinceStr}' AND processed_at:<'${sinceStr}'`,
            first: 250,
          },
        })
        .then((r) => r.json()),
      admin
        .graphql(GET_PRODUCTS, {
          variables: { query: "", first: 50 },
        })
        .then((r) => r.json()),
    ]);

    const orderEdges: ShopifyEdge<OrderNode>[] = ordersRes.data?.orders?.edges || [];
    const totalRevenue = orderEdges.reduce(
      (sum: number, { node }: ShopifyEdge<OrderNode>) =>
        sum + parseFloat(node.totalPriceSet.shopMoney.amount),
      0,
    );
    const orderCount = orderEdges.length;
    const aov = orderCount > 0 ? totalRevenue / orderCount : 0;

    const priorEdges: ShopifyEdge<OrderNode>[] = priorOrdersRes.data?.orders?.edges || [];
    const priorRevenue = priorEdges.reduce(
      (sum: number, { node }: ShopifyEdge<OrderNode>) =>
        sum + parseFloat(node.totalPriceSet.shopMoney.amount),
      0,
    );
    const revenueDelta =
      priorRevenue > 0
        ? ((totalRevenue - priorRevenue) / priorRevenue) * 100
        : null;

    const lowStock = (productsRes.data?.products?.edges as ShopifyEdge<ProductNode>[] || [])
      .filter(
        ({ node }: ShopifyEdge<ProductNode>) => node.totalInventory < 10 && node.totalInventory >= 0,
      )
      .map(({ node }: ShopifyEdge<ProductNode>) => node.title);

    // Build a compact context string for the AI system prompt
    const welcomeContext = [
      `Revenue (7d): $${Math.round(totalRevenue).toLocaleString()}`,
      revenueDelta !== null ? `Revenue WoW: ${revenueDelta > 0 ? "+" : ""}${revenueDelta.toFixed(1)}%` : "",
      `Orders (7d): ${orderCount}`,
      `AOV: $${aov.toFixed(2)}`,
      lowStock.length > 0
        ? `Low stock alerts: ${lowStock.join(", ")}`
        : "No low stock alerts",
    ].filter(Boolean).join(" | ");

    return {
      kpis: {
        totalRevenue,
        orderCount,
        aov,
        revenueDelta,
        lowStockCount: lowStock.length,
      },
      welcomeContext,
    };
  } catch (error) {
    console.error("Dashboard loader error:", error);
    return {
      kpis: {
        totalRevenue: 0,
        orderCount: 0,
        aov: 0,
        revenueDelta: null,
        lowStockCount: 0,
      },
      welcomeContext: "",
    };
  }
};

export default function Index() {
  const { kpis, welcomeContext } = useLoaderData<typeof loader>();
  const sendPromptRef = useRef<((text: string) => void) | null>(null);

  const handleReady = useCallback((sendPrompt: (text: string) => void) => {
    sendPromptRef.current = sendPrompt;
  }, []);

  const handleDigDeeper = useCallback((prompt: string) => {
    sendPromptRef.current?.(prompt);
  }, []);

  return (
    <s-page heading="Store AI">
      <div
        style={{
          height: "calc(100vh - 100px)",
          display: "flex",
          flexDirection: "column",
          border: "1px solid var(--p-color-border, #e1e3e5)",
          borderRadius: "10px",
          overflow: "hidden",
          background: "var(--p-color-bg-surface, #fff)",
        }}
      >
        <KPIStrip kpis={kpis} onDigDeeper={handleDigDeeper} />
        <ChatInterface welcomeContext={welcomeContext} onReady={handleReady} />
      </div>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
