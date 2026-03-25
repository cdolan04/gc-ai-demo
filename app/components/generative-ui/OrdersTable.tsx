import { useState } from "react";

interface Order {
  id: string;
  name: string;
  createdAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  total: number;
  currency: string;
  customer: { name: string; email: string } | null;
  lineItems: Array<{ name: string; quantity: number }>;
}

const COLLAPSED_LIMIT = 5;

export function OrdersTable({ orders }: { orders: Order[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!orders || orders.length === 0) {
    return (
      <div style={{ padding: "12px", fontSize: "13px", color: "#616161" }}>
        No orders found.
      </div>
    );
  }

  const visibleOrders = expanded ? orders.slice(0, 50) : orders.slice(0, COLLAPSED_LIMIT);
  const hasMore = orders.length > COLLAPSED_LIMIT;

  return (
    <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--p-color-border, #e1e3e5)", animation: "fadeSlideIn 0.3s ease-out" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "13px",
        }}
      >
        <thead>
          <tr style={{ background: "var(--p-color-bg-surface-secondary, #f6f6f7)" }}>
            <th style={thStyle}>Order</th>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Customer</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Total</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Fulfillment</th>
          </tr>
        </thead>
        <tbody>
          {visibleOrders.map((order) => (
            <tr
              key={order.id}
              style={{
                borderBottom: "1px solid var(--p-color-border, #e1e3e5)",
              }}
            >
              <td style={{ ...tdStyle, fontWeight: 600 }}>{order.name}</td>
              <td style={tdStyle}>
                {new Date(order.createdAt).toLocaleDateString()}
              </td>
              <td style={tdStyle}>{order.customer?.name || "Guest"}</td>
              <td style={{ ...tdStyle, textAlign: "right", fontWeight: 500 }}>
                ${order.total.toFixed(2)}
              </td>
              <td style={tdStyle}>
                <StatusBadge status={order.financialStatus} />
              </td>
              <td style={tdStyle}>
                <StatusBadge status={order.fulfillmentStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: "100%",
            padding: "8px 12px",
            fontSize: "12px",
            fontWeight: 600,
            color: "#2c6ecb",
            textAlign: "center",
            background: "#f6f6f7",
            border: "none",
            borderTop: "1px solid var(--p-color-border, #e1e3e5)",
            cursor: "pointer",
          }}
        >
          {expanded
            ? "Show less"
            : `Show all ${orders.length} orders`}
        </button>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = (status || "").toLowerCase().replace(/_/g, " ");
  let color = "#616161";
  let bg = "#f6f6f7";

  if (normalized.includes("paid") || normalized.includes("fulfilled")) {
    color = "#1a7e37";
    bg = "#e3f1df";
  } else if (normalized.includes("partial")) {
    color = "#916a00";
    bg = "#fff5ea";
  } else if (
    normalized.includes("refund") ||
    normalized.includes("void") ||
    normalized.includes("unfulfilled")
  ) {
    color = "#d72c0d";
    bg = "#fff4f4";
  }

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: 500,
        background: bg,
        color: color,
        textTransform: "capitalize",
      }}
    >
      {normalized || "—"}
    </span>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontWeight: 600,
  fontSize: "12px",
  color: "var(--p-color-text-secondary, #616161)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  color: "var(--p-color-text, #202223)",
};
