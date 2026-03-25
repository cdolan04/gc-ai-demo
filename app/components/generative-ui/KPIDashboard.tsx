interface Insight {
  type: string;
  label: string;
  value: string;
  detail: string;
  sentiment: "positive" | "negative" | "warning" | "info";
  // Structured data for rich tile rendering
  percentChange?: number;
  currentValue?: number;
  previousValue?: number;
  periodLabel?: string;
  productName?: string;
  currentStock?: number;
  daysRemaining?: number;
  dailyVelocity?: number;
  margin?: number;
  volumeRank?: number;
  totalProducts?: number;
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

const DIG_DEEPER_PROMPTS: Record<string, string> = {
  trend: "Show me the revenue trend over the last 30 days as a chart",
  inventory: "Show me full inventory status for all products",
  opportunity: "Compare my highest-margin product against my top seller — show me the opportunity",
};

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
      {/* Insight tiles — each type gets a distinct visual treatment */}
      {hasInsights && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {data.insights!.map((insight, i) => {
            switch (insight.type) {
              case "trend":
                return <TrendTile key={i} insight={insight} onAction={onAction} />;
              case "inventory":
                return <AlertTile key={i} insight={insight} onAction={onAction} />;
              case "opportunity":
                return <OpportunityTile key={i} insight={insight} onAction={onAction} />;
              default:
                return <InsightCard key={i} insight={insight} onAction={onAction} />;
            }
          })}
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

      {/* Low stock alerts — fallback when insights aren't available */}
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

// ---------------------------------------------------------------------------
// Tile: Revenue Trend — big percentage + directional arrow
// ---------------------------------------------------------------------------
function TrendTile({
  insight,
  onAction,
}: {
  insight: Insight;
  onAction?: (prompt: string) => void;
}) {
  const isNeg = (insight.percentChange ?? 0) < 0;
  const pct = insight.percentChange ?? 0;
  const color = isNeg ? "#dc2626" : "#16a34a";

  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "12px",
        background: isNeg
          ? "linear-gradient(135deg, #fff5f5, #fff0f0)"
          : "linear-gradient(135deg, #f0faf0, #e8f5e8)",
        border: `1px solid ${isNeg ? "#fecaca" : "#bbf7d0"}`,
      }}
    >
      <div style={{ fontSize: "12px", fontWeight: 600, color: "#888", marginBottom: "8px", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>
        Revenue Trend
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "40px", fontWeight: 700, color, lineHeight: 1 }}>
          {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
        </span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ transform: isNeg ? "rotate(180deg)" : "none", color }}>
          <path d="M12 4l-8 8h5v8h6v-8h5L12 4z" fill="currentColor" />
        </svg>
      </div>
      <div style={{ fontSize: "13px", color: "#666", marginTop: "6px" }}>
        {insight.periodLabel ?? `vs prior period`}
        {insight.previousValue != null && insight.currentValue != null && (
          <span> (${insight.previousValue.toLocaleString()} → ${insight.currentValue.toLocaleString()})</span>
        )}
      </div>
      <DigDeeperButton type={insight.type} onAction={onAction} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tile: Stock Alert — depletion bar + days remaining
// ---------------------------------------------------------------------------
function AlertTile({
  insight,
  onAction,
}: {
  insight: Insight;
  onAction?: (prompt: string) => void;
}) {
  const stock = insight.currentStock ?? 0;
  const barPct = Math.max(3, Math.min(100, (stock / 100) * 100));
  const barColor = stock < 15 ? "#ef4444" : stock < 50 ? "#f59e0b" : "#22c55e";

  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "12px",
        background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
        border: "1px solid #fde68a",
      }}
    >
      <div style={{ fontSize: "12px", fontWeight: 600, color: "#888", marginBottom: "8px", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>
        Stock Alert
      </div>
      <div style={{ fontWeight: 700, fontSize: "16px", color: "#202223", marginBottom: "12px" }}>
        {insight.productName ?? insight.value}
      </div>
      {/* Depletion bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
        <div style={{ flex: 1, height: "10px", borderRadius: "5px", background: "#e5e7eb", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${barPct}%`,
              borderRadius: "5px",
              background: barColor,
              transition: "width 0.5s ease",
            }}
          />
        </div>
        <span style={{ fontSize: "14px", fontWeight: 700, color: barColor, whiteSpace: "nowrap" as const }}>
          {stock} left
        </span>
      </div>
      <div style={{ fontSize: "13px", color: "#666" }}>
        {insight.daysRemaining != null
          ? `~${insight.daysRemaining} days at current sales velocity`
          : insight.detail}
        {insight.dailyVelocity != null && insight.dailyVelocity > 0 && (
          <span> ({insight.dailyVelocity.toFixed(1)}/day)</span>
        )}
      </div>
      <DigDeeperButton type={insight.type} onAction={onAction} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tile: Hidden Gem — big margin number + volume rank contrast
// ---------------------------------------------------------------------------
function OpportunityTile({
  insight,
  onAction,
}: {
  insight: Insight;
  onAction?: (prompt: string) => void;
}) {
  const margin = insight.margin ?? 0;
  const rank = insight.volumeRank ?? 0;

  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "12px",
        background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
        border: "1px solid #bfdbfe",
      }}
    >
      <div style={{ fontSize: "12px", fontWeight: 600, color: "#888", marginBottom: "8px", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>
        Hidden Gem
      </div>
      <div style={{ fontWeight: 700, fontSize: "16px", color: "#202223", marginBottom: "10px" }}>
        {insight.productName ?? insight.value}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "16px", marginBottom: "8px" }}>
        {/* Big margin number */}
        <div>
          <span style={{ fontSize: "42px", fontWeight: 700, color: "#2563eb", lineHeight: 1 }}>
            {margin}%
          </span>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#888", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>
            margin
          </div>
        </div>
        {/* Contrast badge */}
        {rank > 0 && (
          <div
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
            }}
          >
            <span style={{ fontSize: "13px", color: "#b91c1c", fontWeight: 600 }}>
              #{rank} by sales volume
            </span>
          </div>
        )}
      </div>
      <div style={{ fontSize: "13px", color: "#666" }}>
        High profit product flying under the radar
      </div>
      <DigDeeperButton type={insight.type} onAction={onAction} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared "Dig deeper" button
// ---------------------------------------------------------------------------
function DigDeeperButton({
  type,
  onAction,
}: {
  type: string;
  onAction?: (prompt: string) => void;
}) {
  if (!onAction) return null;
  const prompt = DIG_DEEPER_PROMPTS[type] || `Tell me more about this`;

  return (
    <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
      <button
        onClick={() => onAction(prompt)}
        style={{
          padding: "6px 14px",
          borderRadius: "6px",
          border: "1px solid #d1d5db",
          background: "rgba(255,255,255,0.7)",
          color: "#374151",
          cursor: "pointer",
          fontSize: "12px",
          fontWeight: 600,
          transition: "background 0.15s",
        }}
        onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,1)")}
        onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.7)")}
      >
        Dig deeper
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fallback: generic InsightCard (for unknown insight types)
// ---------------------------------------------------------------------------
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
        <div style={{ fontSize: "13px", fontWeight: 600, color: colors.accent, marginBottom: "2px" }}>
          {insight.label}
        </div>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--p-color-text, #202223)" }}>
          {insight.value}
        </div>
        <div style={{ fontSize: "12px", color: "var(--p-color-text-secondary, #616161)", marginTop: "1px" }}>
          {insight.detail}
        </div>
      </div>
      <DigDeeperButton type={insight.type} onAction={onAction} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetricPill — compact stat display
// ---------------------------------------------------------------------------
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
