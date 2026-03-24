import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { ChatInterface } from "../components/chat/ChatInterface";
import {
  GET_PRODUCTS,
  GET_ORDERS,
  GET_PRODUCTS_COUNT,
} from "../lib/ai/shopify-queries";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // Fetch dashboard data server-side on page load
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysStr = thirtyDaysAgo.toISOString();

  try {
    const [productsCountRes, ordersRes, sparklineOrdersRes, productsRes] =
      await Promise.all([
        admin.graphql(GET_PRODUCTS_COUNT).then((r) => r.json()),
        admin
          .graphql(GET_ORDERS, {
            variables: {
              query: `created_at:>='${sinceStr}'`,
              first: 250,
            },
          })
          .then((r) => r.json()),
        admin
          .graphql(GET_ORDERS, {
            variables: {
              query: `created_at:>='${thirtyDaysStr}'`,
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

    // Low stock
    const lowStock = (productsRes.data?.products?.edges || [])
      .filter(
        ({ node }: any) => node.totalInventory < 10 && node.totalInventory >= 0,
      )
      .map(({ node }: any) => ({
        title: node.title,
        inventory: node.totalInventory,
      }));

    // Sparkline: revenue by day for last 30 days
    const sparklineEdges = sparklineOrdersRes.data?.orders?.edges || [];
    const byDay: Record<string, number> = {};
    for (const { node } of sparklineEdges) {
      const day = node.createdAt.split("T")[0];
      byDay[day] = (byDay[day] || 0) + parseFloat(node.totalPriceSet.shopMoney.amount);
    }
    const sparklineData = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({
        date,
        revenue: Math.round(revenue * 100) / 100,
      }));

    return {
      kpi: {
        totalProducts: productsCountRes.data?.productsCount?.count || 0,
        orderCount,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        aov: Math.round(aov * 100) / 100,
        lowStock,
      },
      sparklineData,
    };
  } catch (error) {
    console.error("Dashboard loader error:", error);
    return {
      kpi: {
        totalProducts: 0,
        orderCount: 0,
        totalRevenue: 0,
        aov: 0,
        lowStock: [],
      },
      sparklineData: [],
    };
  }
};

export default function Index() {
  const { kpi, sparklineData } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Store AI">
      {/* KPI Cards */}
      <s-section>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <KPICard
            label="Orders (7d)"
            value={kpi.orderCount.toLocaleString()}
            color="#2c6ecb"
          />
          <KPICard
            label="Revenue (7d)"
            value={`$${kpi.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            color="#008060"
          />
          <KPICard
            label="Avg Order Value"
            value={`$${kpi.aov.toFixed(2)}`}
            color="#7c6dc8"
          />
          <KPICard
            label="Low Stock Items"
            value={kpi.lowStock.length.toString()}
            color={kpi.lowStock.length > 0 ? "#d72c0d" : "#616161"}
          />
        </div>

        {/* Sparkline */}
        {sparklineData.length > 0 && (
          <div
            style={{
              background: "var(--p-color-bg-surface, #fff)",
              borderRadius: "10px",
              border: "1px solid var(--p-color-border, #e1e3e5)",
              padding: "16px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                marginBottom: "8px",
                color: "var(--p-color-text, #202223)",
              }}
            >
              30-Day Sales Trend
            </div>
            <MiniSparkline data={sparklineData} />
          </div>
        )}
      </s-section>

      {/* Chat Panel */}
      <s-section heading="AI Assistant">
        <div
          style={{
            border: "1px solid var(--p-color-border, #e1e3e5)",
            borderRadius: "10px",
            overflow: "hidden",
            background: "var(--p-color-bg-surface, #fff)",
            minHeight: "500px",
            maxHeight: "700px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <ChatInterface />
        </div>
      </s-section>
    </s-page>
  );
}

function KPICard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        padding: "14px",
        background: "var(--p-color-bg-surface, #fff)",
        borderRadius: "10px",
        border: "1px solid var(--p-color-border, #e1e3e5)",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          color: "var(--p-color-text-secondary, #616161)",
          marginBottom: "4px",
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "22px", fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

function MiniSparkline({
  data,
}: {
  data: Array<{ date: string; revenue: number }>;
}) {
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.revenue));
  const width = 100;
  const height = 40;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (d.revenue / (max || 1)) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: "60px" }}
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke="#008060"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
