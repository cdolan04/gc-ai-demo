import { useState, useCallback } from "react";

interface LiquidPreviewData {
  status: string;
  title: string;
  htmlContent: string;
  productTitle: string;
  productPrice: string;
  message: string;
}

export function LiquidPreview({ data }: { data: LiquidPreviewData }) {
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publishPage",
          title: data.title,
          htmlContent: data.htmlContent,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setPublished(true);
      } else {
        setError(result.errors?.[0]?.message || "Failed to publish page");
      }
    } catch (e: any) {
      setError(e.message || "Failed to publish page");
    } finally {
      setPublishing(false);
    }
  }, [data]);

  return (
    <div
      style={{
        border: "1px solid var(--p-color-border, #e1e3e5)",
        borderRadius: "10px",
        overflow: "hidden",
        background: "var(--p-color-bg-surface, #fff)",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--p-color-border, #e1e3e5)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--p-color-bg-surface-secondary, #f6f6f7)",
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: "14px" }}>
            Page Preview: {data.title}
          </div>
          <div style={{ fontSize: "12px", color: "#616161" }}>
            {data.message}
          </div>
        </div>
        {!published ? (
          <button
            onClick={handlePublish}
            disabled={publishing}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: publishing
                ? "var(--p-color-bg-fill-disabled, #bdc1cc)"
                : "var(--p-color-bg-fill-brand, #008060)",
              color: "#fff",
              cursor: publishing ? "not-allowed" : "pointer",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            {publishing ? "Publishing..." : "Publish Page"}
          </button>
        ) : (
          <span
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              background: "#e3f1df",
              color: "#1a7e37",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            Published
          </span>
        )}
      </div>
      {error && (
        <div
          style={{
            padding: "8px 16px",
            background: "#fff4f4",
            color: "#d72c0d",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}
      <div style={{ padding: "16px" }}>
        <iframe
          srcDoc={data.htmlContent}
          title="Page Preview"
          style={{
            width: "100%",
            minHeight: "400px",
            border: "1px solid #e1e3e5",
            borderRadius: "8px",
          }}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}
