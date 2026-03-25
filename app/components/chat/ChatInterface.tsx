import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useRef, useEffect, useState, useMemo } from "react";
import { MessageRenderer } from "./MessageRenderer";

export function ChatInterface({
  welcomeContext,
  onReady,
}: {
  welcomeContext?: string;
  onReady?: (sendPrompt: (text: string) => void) => void;
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: welcomeContext ? { welcomeContext } : undefined,
      }),
    [welcomeContext],
  );

  const { messages, status, sendMessage, error } = useChat({
    transport,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
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

  // Expose sendPrompt to parent via onReady
  useEffect(() => {
    onReady?.(sendPrompt);
  }, [onReady, sendPrompt]);

  const suggestedPrompts = [
    "Which products drive the most revenue?",
    "Compare my highest-margin product against my top seller",
    "Show me customer segments",
    "Show me low stock items",
  ];

  // Show suggested prompts when chat is empty or after first AI response
  const showSuggestions =
    (messages.length === 0 ||
      (messages.length >= 2 &&
        messages.filter((m) => m.role === "user").length <= 1)) &&
    !isLoading;

  // Helper to extract text content from a UIMessage
  const getMessageText = (message: UIMessage): string => {
    return message.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
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
                <MessageRenderer message={message} onSendPrompt={sendPrompt} />
              </div>
            )}
          </div>
        ))}

        {/* Welcome message + suggested prompts */}
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 16px 8px" }}>
            <div style={{ fontSize: "18px", fontWeight: 600, color: "var(--p-color-text, #202223)" }}>
              How can I help with your store today?
            </div>
            <div style={{ fontSize: "13px", color: "var(--p-color-text-secondary, #616161)", marginTop: "4px" }}>
              Ask me anything about your products, orders, or customers.
            </div>
          </div>
        )}
        {showSuggestions && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "4px 0", justifyContent: messages.length === 0 ? "center" : undefined }}>
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
        )}

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
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>
              {error.message.toLowerCase().includes("overloaded")
                ? "The AI service is temporarily busy. Please try again in a moment."
                : `Error: ${error.message}`}
            </span>
            <button
              onClick={() => {
                const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
                const text = lastUserMsg ? getMessageText(lastUserMsg) : "Give me a store overview";
                sendPrompt(text);
              }}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid var(--p-color-text-critical, #d72c0d)",
                background: "transparent",
                color: "var(--p-color-text-critical, #d72c0d)",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              Retry
            </button>
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
