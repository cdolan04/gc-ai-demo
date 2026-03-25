import { useState, useCallback } from "react";

interface ProductUpdateData {
  status: string;
  productId: string;
  before: { title: string; description: string };
  after: { title: string; description: string };
  message: string;
}

export function ProductUpdateConfirm({ data }: { data: ProductUpdateData }) {
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = useCallback(async () => {
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateProduct",
          productId: data.productId,
          title: data.before.title !== data.after.title ? data.after.title : undefined,
          descriptionHtml:
            data.before.description !== data.after.description
              ? data.after.description
              : undefined,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setConfirmed(true);
      } else {
        setError(result.errors?.[0]?.message || "Failed to update product");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update product");
    } finally {
      setConfirming(false);
    }
  }, [data]);

  const titleChanged = data.before.title !== data.after.title;
  const descChanged = data.before.description !== data.after.description;

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
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--p-color-border, #e1e3e5)",
          background: "var(--p-color-bg-surface-secondary, #f6f6f7)",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: "14px" }}>
          Product Update Preview
        </div>
        <div style={{ fontSize: "12px", color: "#616161" }}>{data.message}</div>
      </div>

      <div style={{ padding: "16px" }}>
        {titleChanged && (
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#616161", marginBottom: "6px" }}>
              TITLE
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div style={diffBox("before")}>
                <div style={{ fontSize: "11px", fontWeight: 600, marginBottom: "4px", color: "#d72c0d" }}>Before</div>
                {data.before.title}
              </div>
              <div style={diffBox("after")}>
                <div style={{ fontSize: "11px", fontWeight: 600, marginBottom: "4px", color: "#1a7e37" }}>After</div>
                {data.after.title}
              </div>
            </div>
          </div>
        )}

        {descChanged && (
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#616161", marginBottom: "6px" }}>
              DESCRIPTION
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div style={diffBox("before")}>
                <div style={{ fontSize: "11px", fontWeight: 600, marginBottom: "4px", color: "#d72c0d" }}>Before</div>
                <div
                  style={{ fontSize: "13px" }}
                  dangerouslySetInnerHTML={{ __html: data.before.description }}
                />
              </div>
              <div style={diffBox("after")}>
                <div style={{ fontSize: "11px", fontWeight: 600, marginBottom: "4px", color: "#1a7e37" }}>After</div>
                <div
                  style={{ fontSize: "13px" }}
                  dangerouslySetInnerHTML={{ __html: data.after.description }}
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: "8px", background: "#fff4f4", color: "#d72c0d", fontSize: "13px", borderRadius: "6px", marginBottom: "10px" }}>
            {error}
          </div>
        )}

        {!confirmed ? (
          <button
            onClick={handleConfirm}
            disabled={confirming}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              background: confirming ? "#bdc1cc" : "#008060",
              color: "#fff",
              cursor: confirming ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {confirming ? "Updating..." : "Confirm Update"}
          </button>
        ) : (
          <div
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              background: "#e3f1df",
              color: "#1a7e37",
              fontSize: "14px",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            Product Updated
          </div>
        )}
      </div>
    </div>
  );
}

function diffBox(type: "before" | "after"): React.CSSProperties {
  return {
    padding: "10px",
    borderRadius: "6px",
    fontSize: "13px",
    background: type === "before" ? "#fff4f4" : "#e3f1df",
    border: `1px solid ${type === "before" ? "#ffd2cc" : "#b3d9c4"}`,
  };
}
