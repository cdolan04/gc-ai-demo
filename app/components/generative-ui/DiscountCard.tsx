import { useState, useCallback } from "react";

interface DiscountData {
  status: string;
  code: string;
  discountType: "percentage" | "fixed_amount";
  value: number;
  title: string;
  appliesTo: string;
  expiresAt: string | null;
  message: string;
}

export function DiscountCard({ data }: { data: DiscountData }) {
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = useCallback(async () => {
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createDiscount",
          code: data.code,
          discountType: data.discountType,
          value: data.value,
          title: data.title,
          expiresAt: data.expiresAt,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setConfirmed(true);
      } else {
        setError(result.errors?.[0]?.message || "Failed to create discount");
      }
    } catch (e: any) {
      setError(e.message || "Failed to create discount");
    } finally {
      setConfirming(false);
    }
  }, [data]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(data.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [data.code]);

  const displayValue =
    data.discountType === "percentage"
      ? `${data.value}% off`
      : `$${data.value} off`;

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
          padding: "16px",
          background:
            "linear-gradient(135deg, var(--p-color-bg-fill-brand, #008060), #00664d)",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: "12px", opacity: 0.8, marginBottom: "4px" }}>
          Discount Code
        </div>
        <div
          style={{
            fontSize: "24px",
            fontWeight: 700,
            fontFamily: "monospace",
            letterSpacing: "2px",
          }}
        >
          {data.code}
        </div>
        <div style={{ fontSize: "16px", fontWeight: 500, marginTop: "4px" }}>
          {displayValue}
        </div>
        <div style={{ fontSize: "13px", opacity: 0.9, marginTop: "4px" }}>
          Applies to: {data.appliesTo}
        </div>
      </div>
      <div style={{ padding: "14px 16px" }}>
        {data.expiresAt && (
          <div style={{ fontSize: "13px", color: "#616161", marginBottom: "4px" }}>
            <strong>Expires:</strong>{" "}
            {new Date(data.expiresAt).toLocaleDateString()}
          </div>
        )}
        <div style={{ fontSize: "12px", color: "#616161", marginBottom: "12px" }}>
          {data.message}
        </div>

        {error && (
          <div
            style={{
              padding: "8px",
              background: "#fff4f4",
              color: "#d72c0d",
              fontSize: "13px",
              borderRadius: "6px",
              marginBottom: "10px",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "8px" }}>
          {!confirmed ? (
            <button
              onClick={handleConfirm}
              disabled={confirming}
              style={{
                flex: 1,
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
              {confirming ? "Creating..." : "Confirm & Create"}
            </button>
          ) : (
            <span
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
                background: "#e3f1df",
                color: "#1a7e37",
                fontSize: "14px",
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              Discount Created
            </span>
          )}
          <button
            onClick={handleCopy}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid var(--p-color-border, #c9cccf)",
              background: "var(--p-color-bg-surface, #fff)",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            {copied ? "Copied!" : "Copy Code"}
          </button>
        </div>
      </div>
    </div>
  );
}
