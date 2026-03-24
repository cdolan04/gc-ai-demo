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

export function ComparisonCard({ data }: { data: ComparisonData }) {
  const products = data.products || [];

  return (
    <div
      style={{
        border: "1px solid var(--p-color-border, #e1e3e5)",
        borderRadius: "10px",
        overflow: "hidden",
        background: "var(--p-color-bg-surface, #fff)",
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
        {products.map((product, i) => (
          <div
            key={product.title}
            style={{
              padding: "16px",
              borderRight:
                i < products.length - 1
                  ? "1px solid var(--p-color-border, #e1e3e5)"
                  : "none",
            }}
          >
            {product.image && (
              <div
                style={{
                  height: "80px",
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
          </div>
        ))}
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
