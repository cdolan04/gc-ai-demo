import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { ChatInterface } from "../components/chat/ChatInterface";
import {
  GET_PRODUCTS,
  GET_ORDERS,
} from "../lib/ai/shopify-queries";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString();

  try {
    const [ordersRes, productsRes] = await Promise.all([
      admin
        .graphql(GET_ORDERS, {
          variables: {
            query: `processed_at:>='${sinceStr}'`,
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

    const orderEdges = ordersRes.data?.orders?.edges || [];
    const totalRevenue = orderEdges.reduce(
      (sum: number, { node }: any) =>
        sum + parseFloat(node.totalPriceSet.shopMoney.amount),
      0,
    );
    const orderCount = orderEdges.length;
    const aov = orderCount > 0 ? totalRevenue / orderCount : 0;

    const lowStock = (productsRes.data?.products?.edges || [])
      .filter(
        ({ node }: any) => node.totalInventory < 10 && node.totalInventory >= 0,
      )
      .map(({ node }: any) => node.title);

    // Build a compact context string for the AI's first briefing
    const welcomeContext = [
      `Revenue (7d): $${Math.round(totalRevenue).toLocaleString()}`,
      `Orders (7d): ${orderCount}`,
      `AOV: $${aov.toFixed(2)}`,
      lowStock.length > 0
        ? `Low stock alerts: ${lowStock.join(", ")}`
        : "No low stock alerts",
    ].join(" | ");

    return { welcomeContext };
  } catch (error) {
    console.error("Dashboard loader error:", error);
    return { welcomeContext: "" };
  }
};

export default function Index() {
  const { welcomeContext } = useLoaderData<typeof loader>();

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
        <ChatInterface welcomeContext={welcomeContext} />
      </div>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
