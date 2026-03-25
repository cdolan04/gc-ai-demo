interface Insight {
  type: string;
  label: string;
  value: string;
  detail: string;
  sentiment: "positive" | "negative" | "warning" | "info";
}

interface KPIData {
  totalProducts: number;
  periodDays: number;
  orderCount: number;
  totalRevenue: number;
  averageOrderValue: number;
  lowStockAlerts: Array<{ title: string; inventory: number }>;
  insights?: Insight[];
  revenueTrendPercent?: number;
  priorPeriodRevenue?: number;
}

export function KPIDashboard({
  data,
  onAction,
}: {
  data: KPIData;
  onAction?: (prompt: string) => void;
}) {
  const hasInsights = data.insights && data.insights.length > 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        animation: "fadeSlideIn 0.3s ease-out",
      }}
    >
      {/* Insight cards — lead with these when available */}
      {hasInsights && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {data.insights!.map((insight, i) => (
            <InsightCard key={i} insight={insight} onAction={onAction} />
          ))}
        </div>
      )}

      {/* Compact metrics row */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <MetricPill
          label={`Revenue (${data.periodDays}d)`}
          value={`$${data.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          trend={data.revenueTrendPercent}
        />
        <MetricPill
          label={`Orders (${data.periodDays}d)`}
          value={data.orderCount.toLocaleString()}
        />
        <MetricPill
          label="AOV"
          value={`$${data.averageOrderValue.toFixed(2)}`}
        />
        <MetricPill
          label="Products"
          value={data.totalProducts.toLocaleString()}
        />
      </div>

      {/* Low stock alerts */}
      {data.lowStockAlerts.length > 0 && !hasInsights && (
        <div
          style={{
            padding: "12px",
            background: "var(--p-color-bg-caution-subdued, #fff5ea)",
            borderRadius: "8px",
            border: "1px solid var(--p-color-border-caution, #ffb800)",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--p-color-text-caution, #916a00)",
              marginBottom: "6px",
            }}
          >
            Low Stock Alerts
          </div>
          {data.lowStockAlerts.map((item) => (
            <div
              key={item.title}
              style={{
                fontSize: "13px",
                color: "var(--p-color-text, #202223)",
                padding: "2px 0",
              }}
            >
              <strong>{item.title}</strong>: {item.inventory} units remaining
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InsightCard({
  insight,
  onAction,
}: {
  insight: Insight;
  onAction?: (prompt: string) => void;
}) {
  const sentimentColors: Record<string, { border: string; bg: string; accent: string }> = {
    positive: { border: "#1a7e37", bg: "#f0faf0", accent: "#1a7e37" },
    negative: { border: "#d72c0d", bg: "#fff4f4", accent: "#d72c0d" },
    warning: { border: "#ffb800", bg: "#fff8eb", accent: "#916a00" },
    info: { border: "#2c6ecb", bg: "#f0f5ff", accent: "#2c6ecb" },
  };

  const colors = sentimentColors[insight.sentiment] || sentimentColors.info;

  const digDeeperPrompts: Record<string, string> = {
    trend: "Show me the revenue trend over the last 30 days as a chart",
    inventory: "Show me full inventory status for all products",
    opportunity: "Are there products I should push harder? Show me the hidden gems",
  };

  const prompt = digDeeperPrompts[insight.type] || `Tell me more about: ${insight.label}`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "12px 14px",
        borderRadius: "8px",
        borderLeft: `4px solid ${colors.border}`,
        background: colors.bg,
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: colors.accent,
            marginBottom: "2px",
          }}
        >
          {insight.label}
        </div>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--p-color-text, #202223)" }}>
          {insight.value}
        </div>
        <div style={{ fontSize: "12px", color: "var(--p-color-text-secondary, #616161)", marginTop: "1px" }}>
          {insight.detail}
        </div>
      </div>
      {onAction && (
        <button
          onClick={() => onAction(prompt)}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            border: `1px solid ${colors.border}`,
            background: "transparent",
            color: colors.accent,
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: 600,
            whiteSpace: "nowrap",
            transition: "background 0.15s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = colors.bg)}
          onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
        >
          Dig deeper
        </button>
      )}
    </div>
  );
}

function MetricPill({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: number;
}) {
  return (
    <div
      style={{
        padding: "8px 14px",
        background: "var(--p-color-bg-surface, #fff)",
        borderRadius: "8px",
        border: "1px solid var(--p-color-border, #e1e3e5)",
        display: "flex",
        alignItems: "baseline",
        gap: "6px",
      }}
    >
      <span style={{ fontSize: "11px", color: "var(--p-color-text-secondary, #616161)", fontWeight: 500 }}>
        {label}
      </span>
      <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--p-color-text, #202223)" }}>
        {value}
      </span>
      {trend !== undefined && trend !== 0 && (
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: trend > 0 ? "#1a7e37" : "#d72c0d",
          }}
        >
          {trend > 0 ? "+" : ""}{trend.toFixed(1)}%
        </span>
      )}
    </div>
  );
}
