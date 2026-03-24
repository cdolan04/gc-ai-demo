import { lazy, Suspense } from "react";

const RechartsChart = lazy(() => import("./SalesChartInner"));

interface DayData {
  date: string;
  revenue: number;
  orderCount: number;
}

export function SalesChart({ data }: { data: DayData[] }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: "12px", fontSize: "13px", color: "#616161" }}>
        No data to chart.
      </div>
    );
  }

  return (
    <Suspense fallback={<ChartSkeleton />}>
      <RechartsChart data={data} />
    </Suspense>
  );
}

function ChartSkeleton() {
  return (
    <div
      style={{
        background: "var(--p-color-bg-surface, #fff)",
        borderRadius: "10px",
        border: "1px solid var(--p-color-border, #e1e3e5)",
        padding: "16px",
        height: "310px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ fontSize: "13px", color: "#616161" }}>Loading chart...</div>
    </div>
  );
}
