import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useRef, useEffect, useState, useMemo } from "react";
import { MessageRenderer } from "./MessageRenderer";

export function ChatInterface() {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );

  const { messages, status, sendMessage, error } = useChat({
    transport,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const isLoading = status === "streaming" || status === "submitted";

  const handleSubmit = useCallback(() => {
    if (!inputValue.trim() || isLoading) return;
    sendMessage({
      role: "user",
      parts: [{ type: "text", text: inputValue.trim() }],
    });
    setInputValue("");
  }, [inputValue, isLoading, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const sendPrompt = useCallback(
    (text: string) => {
      sendMessage({
        role: "user",
        parts: [{ type: "text", text }],
      });
    },
    [sendMessage],
  );

  const suggestedPrompts = [
    "How did we do this week?",
    "Which products drive the most revenue?",
    "Are there products I should push harder?",
    "Show me low stock items",
  ];

  // Helper to extract text content from a UIMessage
  const getMessageText = (message: UIMessage): string => {
    return message.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {messages.length === 0 && (
          <div style={{ padding: "24px 0" }}>
            <p
              style={{
                fontSize: "14px",
                color: "var(--p-color-text-secondary, #616161)",
                marginBottom: "16px",
                lineHeight: "1.5",
              }}
            >
              I'm your store analyst. I pulled today's snapshot above — ask me
              anything to dig deeper, or tell me to take action like creating a
              landing page or discount code.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendPrompt(prompt)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--p-color-border, #c9cccf)",
                    background: "var(--p-color-bg-surface, #fff)",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: "var(--p-color-text, #202223)",
                    transition: "background 0.15s",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background =
                      "var(--p-color-bg-surface-hover, #f1f2f3)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background =
                      "var(--p-color-bg-surface, #fff)")
                  }
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems:
                message.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            {message.role === "user" ? (
              <div
                style={{
                  background: "var(--p-color-bg-fill-brand, #008060)",
                  color: "#fff",
                  padding: "10px 14px",
                  borderRadius: "12px 12px 2px 12px",
                  maxWidth: "80%",
                  fontSize: "14px",
                  lineHeight: "1.5",
                }}
              >
                {getMessageText(message)}
              </div>
            ) : (
              <div style={{ maxWidth: "100%", width: "100%" }}>
                <MessageRenderer message={message} />
              </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div
            style={{
              display: "flex",
              gap: "4px",
              padding: "12px",
              alignItems: "center",
            }}
          >
            <div style={dotStyle(0)} />
            <div style={dotStyle(1)} />
            <div style={dotStyle(2)} />
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "12px",
              background: "var(--p-color-bg-critical-subdued, #fff4f4)",
              borderRadius: "8px",
              color: "var(--p-color-text-critical, #d72c0d)",
              fontSize: "13px",
            }}
          >
            Error: {error.message}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          borderTop: "1px solid var(--p-color-border, #c9cccf)",
          padding: "12px 16px",
          background: "var(--p-color-bg-surface, #fff)",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your store..."
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              border: "1px solid var(--p-color-border, #c9cccf)",
              borderRadius: "8px",
              padding: "10px 12px",
              fontSize: "14px",
              fontFamily: "inherit",
              lineHeight: "1.5",
              outline: "none",
              minHeight: "40px",
              maxHeight: "120px",
            }}
            disabled={isLoading}
          />
          <button
            onClick={handleSubmit}
            disabled={!inputValue.trim() || isLoading}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              background:
                !inputValue.trim() || isLoading
                  ? "var(--p-color-bg-fill-disabled, #bdc1cc)"
                  : "var(--p-color-bg-fill-brand, #008060)",
              color: "#fff",
              cursor:
                !inputValue.trim() || isLoading ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            {isLoading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

function dotStyle(index: number): React.CSSProperties {
  return {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "var(--p-color-text-secondary, #616161)",
    animation: `pulse 1.4s ease-in-out ${index * 0.2}s infinite`,
    opacity: 0.4,
  };
}
