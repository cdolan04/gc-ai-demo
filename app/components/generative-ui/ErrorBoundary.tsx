import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class UIErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Generative UI error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          style={{
            padding: "12px",
            background: "var(--p-color-bg-critical-subdued, #fff4f4)",
            borderRadius: "8px",
            border: "1px solid var(--p-color-border-critical, #ffd2cc)",
            fontSize: "13px",
            color: "var(--p-color-text-critical, #d72c0d)",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>
            Failed to render this component
          </div>
          <div style={{ opacity: 0.8 }}>
            {this.state.error?.message || "An unexpected error occurred"}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
