interface KPIData {
  totalProducts: number;
  periodDays: number;
  orderCount: number;
  totalRevenue: number;
  averageOrderValue: number;
  lowStockAlerts: Array<{ title: string; inventory: number }>;
}

export function KPIDashboard({ data }: { data: KPIData }) {
  const cards = [
    {
      label: `Orders (${data.periodDays}d)`,
      value: data.orderCount.toLocaleString(),
      color: "#2c6ecb",
    },
    {
      label: `Revenue (${data.periodDays}d)`,
      value: `$${data.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      color: "#008060",
    },
    {
      label: "Avg Order Value",
      value: `$${data.averageOrderValue.toFixed(2)}`,
      color: "#7c6dc8",
    },
    {
      label: "Total Products",
      value: data.totalProducts.toLocaleString(),
      color: "#616161",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "10px",
        }}
      >
        {cards.map((card) => (
          <div
            key={card.label}
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
              {card.label}
            </div>
            <div
              style={{
                fontSize: "22px",
                fontWeight: 600,
                color: card.color,
              }}
            >
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {data.lowStockAlerts.length > 0 && (
        <div
          style={{
            padding: "12px",
            background: "var(--p-color-bg-caution-subdued, #fff5ea)",
            borderRadius: "8px",
            border: "1px solid var(--p-color-border-caution, #ffb800)",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--p-color-text-caution, #916a00)",
              marginBottom: "6px",
            }}
          >
            Low Stock Alerts
          </div>
          {data.lowStockAlerts.map((item) => (
            <div
              key={item.title}
              style={{
                fontSize: "13px",
                color: "var(--p-color-text, #202223)",
                padding: "2px 0",
              }}
            >
              <strong>{item.title}</strong>: {item.inventory} units remaining
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
