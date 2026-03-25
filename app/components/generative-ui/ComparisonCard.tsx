interface ProductComparison {
  title: string;
  price: string;
  margin: number;
  revenue: number;
  unitsSold: number;
  reorderRate?: number;
  image?: string | null;
}

interface ComparisonData {
  status: string;
  products: ProductComparison[];
  insight: string;
  suggestedAction?: string;
}

export function ComparisonCard({
  data,
  onAction,
}: {
  data: ComparisonData;
  onAction?: (text: string) => void;
}) {
  const products = data.products || [];

  // Determine winner by margin contribution (margin % * revenue)
  const marginContributions = products.map(
    (p) => (p.margin / 100) * p.revenue,
  );
  const maxContribution = Math.max(...marginContributions);
  const winnerIdx = marginContributions.indexOf(maxContribution);

  return (
    <div
      style={{
        border: "1px solid var(--p-color-border, #e1e3e5)",
        borderRadius: "10px",
        overflow: "hidden",
        background: "var(--p-color-bg-surface, #fff)",
        animation: "fadeSlideIn 0.3s ease-out",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          background: "var(--p-color-bg-surface-secondary, #f6f6f7)",
          borderBottom: "1px solid var(--p-color-border, #e1e3e5)",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--p-color-text, #202223)" }}>
          Product Comparison
        </div>
      </div>

      {/* Side-by-side cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(products.length, 3)}, 1fr)`,
          gap: "0",
        }}
      >
        {products.map((product, i) => {
          const isWinner = i === winnerIdx && products.length > 1;
          const contribution = marginContributions[i];
          const contributionPct = maxContribution > 0 ? (contribution / maxContribution) * 100 : 0;

          return (
            <div
              key={product.title}
              style={{
                padding: "16px",
                borderRight:
                  i < products.length - 1
                    ? "1px solid var(--p-color-border, #e1e3e5)"
                    : "none",
                borderTop: isWinner ? "3px solid #008060" : "3px solid transparent",
                position: "relative",
              }}
            >
              {isWinner && (
                <div
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    background: "#e3f1df",
                    color: "#1a7e37",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  Recommended
                </div>
              )}

              {product.image ? (
                <div
                  style={{
                    height: "120px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "10px",
                    background: "#f6f6f7",
                    borderRadius: "6px",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={product.image}
                    alt={product.title}
                    style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    height: "120px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "10px",
                    background: "linear-gradient(135deg, #f0f0f0, #e8e8e8)",
                    borderRadius: "6px",
                    fontSize: "28px",
                    fontWeight: 700,
                    color: "#ccc",
                  }}
                >
                  {product.title[0]}
                </div>
              )}
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "14px",
                  marginBottom: "10px",
                  color: "var(--p-color-text, #202223)",
                }}
              >
                {product.title}
              </div>

              <MetricRow label="Price" value={product.price} />
              <MetricRow
                label="Margin"
                value={`${product.margin.toFixed(0)}%`}
                highlight={product.margin >= 70}
              />
              <MetricRow
                label="Revenue"
                value={`$${product.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              />
              <MetricRow label="Units Sold" value={product.unitsSold.toLocaleString()} />
              {product.reorderRate !== undefined && (
                <MetricRow
                  label="Reorder Rate"
                  value={`${product.reorderRate.toFixed(1)}x`}
                  highlight={product.reorderRate >= 2}
                />
              )}

              {/* Margin contribution bar */}
              <div style={{ marginTop: "8px" }}>
                <div style={{ fontSize: "11px", color: "#616161", marginBottom: "3px" }}>
                  Margin contribution
                </div>
                <div style={{ height: "6px", borderRadius: "3px", background: "#e1e3e5", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${contributionPct}%`,
                      borderRadius: "3px",
                      background: isWinner ? "#008060" : "#8c9196",
                      transition: "width 0.3s",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Insight */}
      <div
        style={{
          padding: "14px 16px",
          borderTop: "1px solid var(--p-color-border, #e1e3e5)",
          background: "var(--p-color-bg-surface-info-subdued, #eef4ff)",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            lineHeight: "1.5",
            color: "var(--p-color-text, #202223)",
          }}
        >
          {data.insight}
        </div>
        {data.suggestedAction && (
          onAction ? (
            <button
              onClick={() => onAction(data.suggestedAction!)}
              style={{
                marginTop: "8px",
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                background: "var(--p-color-bg-fill-brand, #008060)",
                color: "#fff",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
                transition: "opacity 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
            >
              {data.suggestedAction}
            </button>
          ) : (
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                marginTop: "6px",
                color: "var(--p-color-text-brand, #008060)",
              }}
            >
              {data.suggestedAction}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "3px 0",
        fontSize: "13px",
      }}
    >
      <span style={{ color: "var(--p-color-text-secondary, #616161)" }}>{label}</span>
      <span
        style={{
          fontWeight: 600,
          color: highlight
            ? "var(--p-color-text-brand, #008060)"
            : "var(--p-color-text, #202223)",
        }}
      >
        {value}
      </span>
    </div>
  );
}
