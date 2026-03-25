import { useState } from "react";
import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { KPIDashboard } from "../generative-ui/KPIDashboard";
import { ProductGrid } from "../generative-ui/ProductGrid";
import { OrdersTable } from "../generative-ui/OrdersTable";
import { SalesChart } from "../generative-ui/SalesChart";
import { CustomerCard } from "../generative-ui/CustomerCard";
import { InventoryStatus } from "../generative-ui/InventoryStatus";
import { LiquidPreview } from "../generative-ui/LiquidPreview";
import { DiscountCard } from "../generative-ui/DiscountCard";
import { ProductUpdateConfirm } from "../generative-ui/ProductUpdateConfirm";
import { ComparisonCard } from "../generative-ui/ComparisonCard";
import { UIErrorBoundary } from "../generative-ui/ErrorBoundary";

interface MessageRendererProps {
  message: UIMessage;
  onSendPrompt?: (text: string) => void;
}

export function MessageRenderer({ message, onSendPrompt }: MessageRendererProps) {
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

          // AI SDK v6: output is present when the tool has completed,
          // regardless of what the state string is
          const hasResult = toolPart.output !== undefined;

          return (
            <UIErrorBoundary key={index}>
              <ToolResultRenderer
                toolName={toolName}
                state={hasResult ? "result" : (toolPart.state || "pending")}
                result={hasResult ? toolPart.output : undefined}
                args={toolPart.input}
                onSendPrompt={onSendPrompt}
              />
            </UIErrorBoundary>
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
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p style={{ margin: "0 0 8px 0" }}>{children}</p>
          ),
          strong: ({ children }) => (
            <strong style={{ fontWeight: 600 }}>{children}</strong>
          ),
          ul: ({ children }) => (
            <ul style={{ margin: "4px 0", paddingLeft: "20px" }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ margin: "4px 0", paddingLeft: "20px" }}>{children}</ol>
          ),
          li: ({ children }) => (
            <li style={{ marginBottom: "2px" }}>{children}</li>
          ),
          code: ({ children }) => (
            <code
              style={{
                background: "var(--p-color-bg-surface-secondary, #f6f6f7)",
                padding: "1px 4px",
                borderRadius: "4px",
                fontSize: "13px",
              }}
            >
              {children}
            </code>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--p-color-text-brand, #008060)",
                textDecoration: "underline",
              }}
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: "13px",
                margin: "8px 0",
              }}
            >
              {children}
            </table>
          ),
          th: ({ children }) => (
            <th
              style={{
                borderBottom: "2px solid var(--p-color-border, #e1e3e5)",
                padding: "6px 8px",
                textAlign: "left",
                fontWeight: 600,
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              style={{
                borderBottom: "1px solid var(--p-color-border, #e1e3e5)",
                padding: "6px 8px",
              }}
            >
              {children}
            </td>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function ToolResultRenderer({
  toolName,
  state,
  result,
  args,
  onSendPrompt,
}: {
  toolName: string;
  state: string;
  result: any;
  args: any;
  onSendPrompt?: (text: string) => void;
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
      return <KPIDashboard data={result} onAction={onSendPrompt} />;
    case "queryProducts":
      return <ProductGrid products={result} />;
    case "queryOrders":
      if (result.aggregation === "day") {
        return <SalesChart data={result.data} />;
      }
      if (result.aggregation === "product") {
        return <ProductGrid products={result.data} isAggregated />;
      }
      return <CollapsedOrders orders={result.data || result} />;
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
    case "compareProducts":
      return <ComparisonCard data={result} onAction={onSendPrompt} />;
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

/**
 * For non-aggregated order queries, show a compact summary instead of a big table.
 * The AI's text response already contains the analysis — the raw table adds no value.
 */
function CollapsedOrders({ orders }: { orders: any[] }) {
  const [showTable, setShowTable] = useState(false);

  if (!orders || orders.length === 0) {
    return (
      <div style={{ padding: "8px 12px", fontSize: "13px", color: "#616161" }}>
        No orders found.
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: "8px",
        border: "1px solid var(--p-color-border, #e1e3e5)",
        overflow: "hidden",
        animation: "fadeSlideIn 0.3s ease-out",
      }}
    >
      <button
        onClick={() => setShowTable(!showTable)}
        style={{
          width: "100%",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--p-color-bg-surface-secondary, #f6f6f7)",
          border: "none",
          cursor: "pointer",
          fontSize: "13px",
          color: "var(--p-color-text-secondary, #616161)",
        }}
      >
        <span>
          <strong style={{ color: "var(--p-color-text, #202223)" }}>
            {orders.length} orders
          </strong>{" "}
          analyzed
        </span>
        <span style={{ fontSize: "12px", color: "#2c6ecb", fontWeight: 600 }}>
          {showTable ? "Hide" : "View"}
        </span>
      </button>
      {showTable && <OrdersTable orders={orders} />}
    </div>
  );
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
    case "compareProducts":
      return "Comparing products...";
    default:
      return "Working...";
  }
}
