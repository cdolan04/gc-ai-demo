interface KPIStripProps {
  kpis: {
    totalRevenue: number;
    orderCount: number;
    aov: number;
    revenueDelta: number | null;
    lowStockCount: number;
  };
  onDigDeeper?: (prompt: string) => void;
}

const tiles = [
  {
    key: "revenue",
    label: "Revenue (7d)",
    prompt: "Show me the revenue trend over the last 30 days as a chart",
  },
  {
    key: "orders",
    label: "Orders (7d)",
    prompt: "Show me recent orders",
  },
  {
    key: "aov",
    label: "Avg Order Value",
    prompt: "Compare my highest-margin product against my top seller",
  },
  {
    key: "lowStock",
    label: "Low Stock",
    prompt: "Show me full inventory status for all products",
  },
] as const;

export function KPIStrip({ kpis, onDigDeeper }: KPIStripProps) {
  const formatValue = (key: string) => {
    switch (key) {
      case "revenue":
        return `$${Math.round(kpis.totalRevenue).toLocaleString()}`;
      case "orders":
        return String(kpis.orderCount);
      case "aov":
        return `$${kpis.aov.toFixed(2)}`;
      case "lowStock":
        return kpis.lowStockCount > 0 ? `${kpis.lowStockCount} items` : "All good";
      default:
        return "";
    }
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        padding: "8px 16px",
        background: "var(--p-color-bg-surface-secondary, #f6f6f7)",
        borderBottom: "1px solid var(--p-color-border, #e1e3e5)",
        flexShrink: 0,
      }}
    >
      {tiles.map((tile) => {
        const isLowStock = tile.key === "lowStock";
        const hasAlert = isLowStock && kpis.lowStockCount > 0;

        return (
          <div
            key={tile.key}
            style={{
              flex: 1,
              background: hasAlert
                ? "var(--p-color-bg-caution-subdued, #fff5ea)"
                : "var(--p-color-bg-surface, #fff)",
              border: `1px solid ${hasAlert ? "var(--p-color-border-caution, #e1b878)" : "var(--p-color-border, #e1e3e5)"}`,
              borderRadius: "8px",
              padding: "8px 10px",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "var(--p-color-text-secondary, #616161)",
                fontWeight: 500,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
              }}
            >
              {tile.label}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: hasAlert
                    ? "var(--p-color-text-caution, #916a00)"
                    : "var(--p-color-text, #202223)",
                }}
              >
                {formatValue(tile.key)}
              </span>
              {tile.key === "revenue" && kpis.revenueDelta !== null && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "1px 5px",
                    borderRadius: "4px",
                    background:
                      kpis.revenueDelta >= 0
                        ? "var(--p-color-bg-success-subdued, #e3f1df)"
                        : "var(--p-color-bg-critical-subdued, #fff4f4)",
                    color:
                      kpis.revenueDelta >= 0
                        ? "var(--p-color-text-success, #008060)"
                        : "var(--p-color-text-critical, #d72c0d)",
                  }}
                >
                  {kpis.revenueDelta >= 0 ? "+" : ""}
                  {kpis.revenueDelta.toFixed(1)}%
                </span>
              )}
            </div>
            {onDigDeeper && (
              <button
                onClick={() => onDigDeeper(tile.prompt)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontSize: "11px",
                  color: "var(--p-color-text-brand, #008060)",
                  fontWeight: 500,
                  textAlign: "left",
                  marginTop: "2px",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.textDecoration = "underline";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.textDecoration = "none";
                }}
              >
                Dig deeper &rarr;
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
