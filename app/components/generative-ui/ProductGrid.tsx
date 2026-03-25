interface Product {
  id?: string;
  title?: string;
  name?: string;
  handle?: string;
  image?: string | null;
  priceRange?: { min: string; max: string; currency: string };
  totalInventory?: number;
  variants?: Array<{
    title: string;
    price: string;
    inventoryQuantity: number;
    margin: number | null;
  }>;
  // Aggregated product data
  revenue?: number;
  unitsSold?: number;
  orderCount?: number;
}

export function ProductGrid({
  products,
  isAggregated = false,
}: {
  products: Product[];
  isAggregated?: boolean;
}) {
  if (isAggregated) {
    const maxRevenue = Math.max(...products.map((p) => p.revenue || 0), 1);

    return (
      <div style={{ overflowX: "auto", animation: "fadeSlideIn 0.3s ease-out" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "2px solid var(--p-color-border, #e1e3e5)",
              }}
            >
              <th style={{ ...thStyle, width: "32px" }}>#</th>
              <th style={thStyle}>Product</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Revenue</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Units Sold</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Orders</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => {
              const revPct = ((p.revenue || 0) / maxRevenue) * 100;
              return (
                <tr
                  key={i}
                  style={{
                    borderBottom: "1px solid var(--p-color-border, #e1e3e5)",
                  }}
                >
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 700,
                      color: i < 3 ? "#008060" : "#8c9196",
                      fontSize: "12px",
                    }}
                  >
                    #{i + 1}
                  </td>
                  <td style={tdStyle}>{p.name || p.title}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                      <div
                        style={{
                          width: "60px",
                          height: "6px",
                          borderRadius: "3px",
                          background: "#e1e3e5",
                          overflow: "hidden",
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${revPct}%`,
                            borderRadius: "3px",
                            background: i === 0 ? "#008060" : "#8c9196",
                          }}
                        />
                      </div>
                      <span style={{ fontWeight: 600 }}>
                        ${p.revenue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{p.unitsSold}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{p.orderCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "10px",
        animation: "fadeSlideIn 0.3s ease-out",
      }}
    >
      {products.map((product, i) => {
        const avgMargin =
          product.variants
            ?.filter((v) => v.margin !== null)
            .reduce((sum, v) => sum + (v.margin || 0), 0)! /
          (product.variants?.filter((v) => v.margin !== null).length || 1);

        return (
          <div
            key={product.id || i}
            style={{
              border: "1px solid var(--p-color-border, #e1e3e5)",
              borderRadius: "10px",
              overflow: "hidden",
              background: "var(--p-color-bg-surface, #fff)",
            }}
          >
            {product.image ? (
              <div
                style={{
                  height: "160px",
                  background: "#f6f6f7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <img
                  src={product.image}
                  alt={product.title || ""}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  height: "160px",
                  background: "linear-gradient(135deg, #f0f0f0, #e8e8e8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "36px",
                  fontWeight: 700,
                  color: "#ccc",
                }}
              >
                {(product.title || "?")[0]}
              </div>
            )}
            <div style={{ padding: "12px" }}>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  marginBottom: "4px",
                  color: "var(--p-color-text, #202223)",
                }}
              >
                {product.title}
              </div>
              {product.priceRange && (
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "var(--p-color-text-brand, #008060)",
                    marginBottom: "4px",
                  }}
                >
                  ${product.priceRange.min}
                  {product.priceRange.min !== product.priceRange.max &&
                    ` - $${product.priceRange.max}`}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  flexWrap: "wrap",
                  marginTop: "6px",
                }}
              >
                {product.totalInventory !== undefined && (
                  <span style={badgeStyle(product.totalInventory > 50 ? "green" : product.totalInventory > 10 ? "yellow" : "red")}>
                    {product.totalInventory} in stock
                  </span>
                )}
                {avgMargin > 0 && (
                  <span style={badgeStyle("blue")}>
                    {avgMargin.toFixed(0)}% margin
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  fontWeight: 600,
  color: "var(--p-color-text-secondary, #616161)",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 10px",
  color: "var(--p-color-text, #202223)",
};

function badgeStyle(
  color: "green" | "yellow" | "red" | "blue",
): React.CSSProperties {
  const colors = {
    green: { bg: "#e3f1df", text: "#1a7e37" },
    yellow: { bg: "#fff5ea", text: "#916a00" },
    red: { bg: "#fff4f4", text: "#d72c0d" },
    blue: { bg: "#e9f0ff", text: "#2c6ecb" },
  };
  return {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: 500,
    background: colors[color].bg,
    color: colors[color].text,
  };
}
