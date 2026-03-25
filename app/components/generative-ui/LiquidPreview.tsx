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
  const [pageHandle, setPageHandle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

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
        if (result.handle) {
          setPageHandle(result.handle);
        }
      } else {
        setError(result.errors?.[0]?.message || "Failed to publish page");
      }
    } catch (e: any) {
      setError(e.message || "Failed to publish page");
    } finally {
      setPublishing(false);
    }
  }, [data]);

  const iframeElement = (
    <iframe
      srcDoc={data.htmlContent}
      title="Page Preview"
      style={{
        width: "100%",
        minHeight: isFullscreen ? "100%" : "400px",
        height: isFullscreen ? "100%" : undefined,
        border: isFullscreen ? "none" : "1px solid #e1e3e5",
        borderRadius: isFullscreen ? "0" : "8px",
        opacity: iframeLoaded ? 1 : 0,
        transition: "opacity 0.2s",
      }}
      sandbox="allow-same-origin"
      onLoad={() => setIframeLoaded(true)}
    />
  );

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
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => {
              setIsFullscreen(!isFullscreen);
              setIframeLoaded(false);
            }}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid var(--p-color-border, #c9cccf)",
              background: "var(--p-color-bg-surface, #fff)",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
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
      </div>

      {/* Published URL */}
      {published && pageHandle && (
        <div
          style={{
            padding: "8px 16px",
            background: "#e3f1df",
            fontSize: "13px",
            color: "#1a7e37",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>Page live at:</span>
          <code style={{ background: "#d0e8d0", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
            /pages/{pageHandle}
          </code>
        </div>
      )}

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

      {/* Fullscreen overlay */}
      {isFullscreen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "#fff",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "8px 16px",
              borderBottom: "1px solid #e1e3e5",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: "14px" }}>
              {data.title} — Full Preview
            </span>
            <button
              onClick={() => setIsFullscreen(false)}
              style={{
                padding: "6px 16px",
                borderRadius: "6px",
                border: "1px solid #c9cccf",
                background: "#fff",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              Close
            </button>
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>{iframeElement}</div>
        </div>
      )}

      {/* Inline preview */}
      {!isFullscreen && (
        <div style={{ padding: "16px", position: "relative" }}>
          {!iframeLoaded && (
            <div
              style={{
                position: "absolute",
                inset: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--p-color-bg-surface-secondary, #f6f6f7)",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#616161",
              }}
            >
              Loading preview...
            </div>
          )}
          {iframeElement}
        </div>
      )}
    </div>
  );
}
