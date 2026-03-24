import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

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

  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <div
      style={{
        background: "var(--p-color-bg-surface, #fff)",
        borderRadius: "10px",
        border: "1px solid var(--p-color-border, #e1e3e5)",
        padding: "16px",
      }}
    >
      <div
        style={{
          fontSize: "14px",
          fontWeight: 600,
          marginBottom: "12px",
          color: "var(--p-color-text, #202223)",
        }}
      >
        Revenue by Day
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e1e3e5" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#616161" }}
            axisLine={{ stroke: "#e1e3e5" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#616161" }}
            axisLine={{ stroke: "#e1e3e5" }}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            formatter={(value) => [
              `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
              "Revenue",
            ]}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e1e3e5",
              fontSize: "13px",
            }}
          />
          <Bar dataKey="revenue" fill="#008060" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
