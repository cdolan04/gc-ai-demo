interface Customer {
  id: string;
  name: string;
  email: string;
  orderCount: number;
  totalSpent: number;
  city: string | null;
  tags: string[];
}

export function CustomerCard({ customers }: { customers: Customer[] }) {
  if (!customers || customers.length === 0) {
    return (
      <div style={{ padding: "12px", fontSize: "13px", color: "#616161" }}>
        No customers found.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", animation: "fadeSlideIn 0.3s ease-out" }}>
      {customers.slice(0, 20).map((customer) => (
        <div
          key={customer.id}
          style={{
            padding: "12px",
            border: "1px solid var(--p-color-border, #e1e3e5)",
            borderRadius: "8px",
            background: "var(--p-color-bg-surface, #fff)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--p-color-text, #202223)" }}>
              {customer.name}
            </div>
            <div style={{ fontSize: "12px", color: "var(--p-color-text-secondary, #616161)" }}>
              {customer.email}
              {customer.city && ` · ${customer.city}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--p-color-text-brand, #008060)" }}>
                ${customer.totalSpent.toFixed(2)}
              </div>
              <div style={{ fontSize: "11px", color: "#616161" }}>
                {customer.orderCount} order{customer.orderCount !== 1 ? "s" : ""}
              </div>
            </div>
            <ValueIndicator spent={customer.totalSpent} orders={customer.orderCount} />
          </div>
        </div>
      ))}
      {customers.length > 20 && (
        <div style={{ fontSize: "12px", color: "#616161", textAlign: "center", padding: "4px" }}>
          Showing 20 of {customers.length} customers
        </div>
      )}
    </div>
  );
}

function ValueIndicator({ spent, orders }: { spent: number; orders: number }) {
  let level: "high" | "medium" | "low" = "low";
  if (spent > 150 || orders >= 3) level = "high";
  else if (spent > 50 || orders >= 2) level = "medium";

  const colors = {
    high: { bg: "#e3f1df", text: "#1a7e37", label: "High Value" },
    medium: { bg: "#fff5ea", text: "#916a00", label: "Medium" },
    low: { bg: "#f6f6f7", text: "#616161", label: "New" },
  };

  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: 600,
        background: colors[level].bg,
        color: colors[level].text,
        whiteSpace: "nowrap",
      }}
    >
      {colors[level].label}
    </span>
  );
}
