interface InventoryItem {
  variantId: string;
  variantTitle: string;
  sku: string;
  inventoryQuantity: number;
  productTitle: string;
  unitCost: string | null;
  locations: Array<{
    locationName: string;
    quantities: Array<{ name: string; quantity: number }>;
  }>;
}

export function InventoryStatus({ items }: { items: InventoryItem[] }) {
  if (!items || items.length === 0) {
    return (
      <div style={{ padding: "12px", fontSize: "13px", color: "#616161" }}>
        No inventory data found.
      </div>
    );
  }

  // Group by product
  const byProduct: Record<string, InventoryItem[]> = {};
  for (const item of items) {
    if (!byProduct[item.productTitle]) byProduct[item.productTitle] = [];
    byProduct[item.productTitle].push(item);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {Object.entries(byProduct).map(([productTitle, variants]) => {
        const totalQty = variants.reduce((s, v) => s + v.inventoryQuantity, 0);
        const level = totalQty > 50 ? "green" : totalQty > 10 ? "yellow" : "red";

        return (
          <div
            key={productTitle}
            style={{
              border: "1px solid var(--p-color-border, #e1e3e5)",
              borderRadius: "8px",
              padding: "12px",
              background: "var(--p-color-bg-surface, #fff)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ fontWeight: 600, fontSize: "14px" }}>{productTitle}</div>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: 500,
                  ...levelColors(level),
                }}
              >
                {totalQty} total
              </span>
            </div>
            {/* Inventory bar */}
            <div style={{ height: "8px", borderRadius: "4px", background: "#e1e3e5", overflow: "hidden", marginBottom: "8px" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, (totalQty / 200) * 100)}%`,
                  borderRadius: "4px",
                  background: level === "green" ? "#1a7e37" : level === "yellow" ? "#ffb800" : "#d72c0d",
                  transition: "width 0.3s",
                }}
              />
            </div>
            {variants.length > 1 && (
              <div style={{ fontSize: "12px", color: "#616161" }}>
                {variants.map((v) => (
                  <span key={v.variantId} style={{ marginRight: "12px" }}>
                    {v.variantTitle}: {v.inventoryQuantity}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function levelColors(level: "green" | "yellow" | "red") {
  const map = {
    green: { background: "#e3f1df", color: "#1a7e37" },
    yellow: { background: "#fff5ea", color: "#916a00" },
    red: { background: "#fff4f4", color: "#d72c0d" },
  };
  return map[level];
}
