import type { UIMessage } from "ai";
import { KPIDashboard } from "../generative-ui/KPIDashboard";
import { ProductGrid } from "../generative-ui/ProductGrid";
import { OrdersTable } from "../generative-ui/OrdersTable";
import { SalesChart } from "../generative-ui/SalesChart";
import { CustomerCard } from "../generative-ui/CustomerCard";
import { InventoryStatus } from "../generative-ui/InventoryStatus";
import { LiquidPreview } from "../generative-ui/LiquidPreview";
import { DiscountCard } from "../generative-ui/DiscountCard";
import { ProductUpdateConfirm } from "../generative-ui/ProductUpdateConfirm";

interface MessageRendererProps {
  message: UIMessage;
}

export function MessageRenderer({ message }: MessageRendererProps) {
  const { parts } = message;

  if (!parts || parts.length === 0) {
    return null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {parts.map((part, index) => {
        if (part.type === "text" && part.text) {
          return <TextBubble key={index} text={part.text} />;
        }

        // Tool parts have type "tool-${toolName}" pattern
        if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
          const toolPart = part as any;
          const toolName =
            part.type === "dynamic-tool"
              ? toolPart.toolName
              : part.type.replace("tool-", "");

          return (
            <ToolResultRenderer
              key={index}
              toolName={toolName}
              state={toolPart.state}
              result={toolPart.state === "result" ? toolPart.output : undefined}
              args={toolPart.input}
            />
          );
        }

        return null;
      })}
    </div>
  );
}

function TextBubble({ text }: { text: string }) {
  if (!text.trim()) return null;

  return (
    <div
      style={{
        fontSize: "14px",
        lineHeight: "1.6",
        color: "var(--p-color-text, #202223)",
        whiteSpace: "pre-wrap",
      }}
    >
      {text}
    </div>
  );
}

function ToolResultRenderer({
  toolName,
  state,
  result,
  args,
}: {
  toolName: string;
  state: string;
  result: any;
  args: any;
}) {
  if (state !== "result") {
    return (
      <div
        style={{
          padding: "12px",
          background: "var(--p-color-bg-surface-secondary, #f6f6f7)",
          borderRadius: "8px",
          fontSize: "13px",
          color: "var(--p-color-text-secondary, #616161)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: "14px",
            height: "14px",
            border: "2px solid var(--p-color-border, #c9cccf)",
            borderTopColor: "var(--p-color-text-brand, #008060)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        {getLoadingText(toolName)}
      </div>
    );
  }

  switch (toolName) {
    case "getStoreSummary":
      return <KPIDashboard data={result} />;
    case "queryProducts":
      return <ProductGrid products={result} />;
    case "queryOrders":
      if (result.aggregation === "day") {
        return <SalesChart data={result.data} />;
      }
      if (result.aggregation === "product") {
        return <ProductGrid products={result.data} isAggregated />;
      }
      return <OrdersTable orders={result.data || result} />;
    case "queryCustomers":
      return <CustomerCard customers={result} />;
    case "queryInventory":
      return <InventoryStatus items={result} />;
    case "generateLiquidPage":
      return <LiquidPreview data={result} />;
    case "createDiscountCode":
      return <DiscountCard data={result} />;
    case "updateProductCopy":
      return <ProductUpdateConfirm data={result} />;
    default:
      return (
        <div
          style={{
            padding: "12px",
            background: "var(--p-color-bg-surface-secondary, #f6f6f7)",
            borderRadius: "8px",
            fontSize: "13px",
          }}
        >
          <pre style={{ margin: 0, overflow: "auto" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      );
  }
}

function getLoadingText(toolName: string): string {
  switch (toolName) {
    case "getStoreSummary":
      return "Pulling store summary...";
    case "queryProducts":
      return "Searching products...";
    case "queryOrders":
      return "Fetching orders...";
    case "queryCustomers":
      return "Looking up customers...";
    case "queryInventory":
      return "Checking inventory...";
    case "generateLiquidPage":
      return "Generating landing page...";
    case "createDiscountCode":
      return "Drafting discount code...";
    case "updateProductCopy":
      return "Preparing product update...";
    default:
      return "Working...";
  }
}
