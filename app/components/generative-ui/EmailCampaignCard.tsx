import { useState, useCallback } from "react";

interface EmailCampaignData {
  status: string;
  type: "audience" | "campaign";
  message: string;
  // Audience fields
  audienceName?: string;
  description?: string;
  customerCount?: number;
  customerEmails?: string[];
  // Campaign fields
  campaignName?: string;
  recipientCount?: number;
  subject?: string;
  previewText?: string;
  htmlBody?: string;
  discountCode?: string | null;
  landingPageUrl?: string | null;
}

interface ResultData {
  profilesAdded?: number;
  profilesNotFound?: number;
  campaignId?: string;
  sent?: boolean;
  recipientCount?: number;
}

export function EmailCampaignCard({
  data,
  type,
}: {
  data: EmailCampaignData;
  type: "audience" | "campaign";
}) {
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const handleConfirm = useCallback(async () => {
    setConfirming(true);
    setError(null);
    try {
      const action =
        type === "audience" ? "createKlaviyoAudience" : "sendKlaviyoCampaign";
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...data }),
      });
      const result = await res.json();
      if (result.success) {
        setConfirmed(true);
        setResultData(result);
      } else {
        setError(result.error || "Operation failed");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setConfirming(false);
    }
  }, [data, type]);

  if (type === "audience") {
    return <AudienceView data={data} confirming={confirming} confirmed={confirmed} error={error} resultData={resultData} onConfirm={handleConfirm} />;
  }

  return <CampaignView data={data} confirming={confirming} confirmed={confirmed} error={error} resultData={resultData} iframeLoaded={iframeLoaded} onIframeLoad={() => setIframeLoaded(true)} onConfirm={handleConfirm} />;
}

function AudienceView({
  data,
  confirming,
  confirmed,
  error,
  resultData,
  onConfirm,
}: {
  data: EmailCampaignData;
  confirming: boolean;
  confirmed: boolean;
  error: string | null;
  resultData: ResultData | null;
  onConfirm: () => void;
}) {
  const emails = data.customerEmails || [];
  const shown = emails.slice(0, 5);
  const remaining = emails.length - shown.length;

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
          padding: "16px",
          background: "linear-gradient(135deg, #5c6ac4, #4b59b8)",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: "12px", opacity: 0.8, marginBottom: "4px" }}>
          Email Audience
        </div>
        <div style={{ fontSize: "20px", fontWeight: 700 }}>
          {data.audienceName}
        </div>
        <div style={{ fontSize: "14px", opacity: 0.9, marginTop: "4px" }}>
          {data.customerCount} customer{data.customerCount !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: "13px", color: "#616161", marginBottom: "12px" }}>
          {data.description}
        </div>

        {/* Email list preview */}
        {shown.length > 0 && (
          <div
            style={{
              padding: "10px 12px",
              background: "var(--p-color-bg-surface-secondary, #f6f6f7)",
              borderRadius: "6px",
              fontSize: "13px",
              marginBottom: "12px",
            }}
          >
            {shown.map((email, i) => (
              <div key={i} style={{ padding: "2px 0", color: "#303030" }}>
                {email}
              </div>
            ))}
            {remaining > 0 && (
              <div style={{ padding: "2px 0", color: "#616161", fontStyle: "italic" }}>
                and {remaining} more
              </div>
            )}
          </div>
        )}

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

        {!confirmed ? (
          <button
            onClick={onConfirm}
            disabled={confirming}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              background: confirming ? "#bdc1cc" : "#5c6ac4",
              color: "#fff",
              cursor: confirming ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {confirming ? "Creating Audience..." : "Create Audience"}
          </button>
        ) : (
          <div
            style={{
              padding: "10px",
              borderRadius: "8px",
              background: "#e3f1df",
              color: "#1a7e37",
              fontSize: "14px",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            Audience Created — {resultData?.profilesAdded ?? data.customerCount} customers added
            {resultData?.profilesNotFound ? ` (${resultData.profilesNotFound} not found in Klaviyo)` : ""}
          </div>
        )}
      </div>
    </div>
  );
}

function CampaignView({
  data,
  confirming,
  confirmed,
  error,
  resultData,
  iframeLoaded,
  onIframeLoad,
  onConfirm,
}: {
  data: EmailCampaignData;
  confirming: boolean;
  confirmed: boolean;
  error: string | null;
  resultData: ResultData | null;
  iframeLoaded: boolean;
  onIframeLoad: () => void;
  onConfirm: () => void;
}) {
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
          padding: "16px",
          background: "linear-gradient(135deg, #5c6ac4, #4b59b8)",
          color: "#fff",
        }}
      >
        <div style={{ fontSize: "12px", opacity: 0.8, marginBottom: "4px" }}>
          Email Campaign
        </div>
        <div style={{ fontSize: "20px", fontWeight: 700 }}>
          {data.campaignName}
        </div>
        <div style={{ fontSize: "13px", opacity: 0.9, marginTop: "4px" }}>
          To: {data.audienceName} — {data.recipientCount} recipient{data.recipientCount !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Subject + preview text */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--p-color-border, #e1e3e5)",
        }}
      >
        <div style={{ fontSize: "15px", fontWeight: 600, color: "#303030" }}>
          {data.subject}
        </div>
        <div style={{ fontSize: "13px", color: "#616161", marginTop: "4px" }}>
          {data.previewText}
        </div>
      </div>

      {/* Badges */}
      {(data.discountCode || data.landingPageUrl) && (
        <div
          style={{
            padding: "8px 16px",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            borderBottom: "1px solid var(--p-color-border, #e1e3e5)",
          }}
        >
          {data.discountCode && (
            <span
              style={{
                padding: "4px 10px",
                borderRadius: "12px",
                background: "#e3f1df",
                color: "#1a7e37",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              Includes discount: {data.discountCode}
            </span>
          )}
          {data.landingPageUrl && (
            <span
              style={{
                padding: "4px 10px",
                borderRadius: "12px",
                background: "#e8e3f1",
                color: "#5c4db8",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              Links to: {data.landingPageUrl}
            </span>
          )}
        </div>
      )}

      {/* Email body preview */}
      {data.htmlBody && (
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
          <iframe
            srcDoc={data.htmlBody}
            title="Email Preview"
            style={{
              width: "100%",
              minHeight: "350px",
              border: "1px solid #e1e3e5",
              borderRadius: "8px",
              opacity: iframeLoaded ? 1 : 0,
              transition: "opacity 0.2s",
            }}
            sandbox="allow-same-origin"
            onLoad={onIframeLoad}
          />
        </div>
      )}

      {/* Action area */}
      <div style={{ padding: "0 16px 14px" }}>
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

        {!confirmed ? (
          <button
            onClick={onConfirm}
            disabled={confirming}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              background: confirming ? "#bdc1cc" : "#5c6ac4",
              color: "#fff",
              cursor: confirming ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {confirming ? "Creating Campaign..." : "Send Campaign"}
          </button>
        ) : (
          <div
            style={{
              padding: "10px",
              borderRadius: "8px",
              background: "#e3f1df",
              color: "#1a7e37",
              fontSize: "14px",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            Campaign Created — {resultData?.recipientCount ?? data.recipientCount} recipients
            {resultData?.sent === true ? " — Sent" : resultData?.sent === false ? " — Queued (sending may require account upgrade)" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
