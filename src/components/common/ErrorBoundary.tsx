import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RotateCcw, Copy, Check } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, copied: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleCopyDetails = () => {
    const errorText = `${this.state.error?.name || "Error"}: ${this.state.error?.message || "Unknown error"}\n\nStack:\n${this.state.error?.stack || "No stack available"}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(errorText).then(() => {
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2000);
      }).catch(() => {
        // Fallback if clipboard permission fails
        this.setState({ copied: false });
      });
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            flex: 1,
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 24px",
            boxSizing: "border-box",
            backgroundColor: "var(--bg-content)",
          }}
        >
          <div
            className="glass-surface"
            style={{
              maxWidth: "440px",
              width: "100%",
              padding: "24px 28px",
              borderRadius: "var(--radius-lg)",
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--separator)",
              boxShadow: "var(--shadow-card)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 69, 58, 0.12)",
                border: "1px solid rgba(255, 69, 58, 0.25)",
                display: "grid",
                placeItems: "center",
                color: "var(--accent-red)",
                marginBottom: "14px",
              }}
            >
              <AlertCircle size={22} />
            </div>

            <h3
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--text-primary)",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              {this.props.fallbackTitle || "Something went wrong in this view"}
            </h3>

            <p
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                marginTop: "6px",
                marginBottom: "18px",
                lineHeight: 1.4,
              }}
            >
              An unexpected error occurred in this view. You can reload the view or copy the error details.
            </p>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                onClick={this.handleReset}
                className="mac-btn focus-ring"
                style={{
                  padding: "7px 16px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--accent-blue)",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={12} />
                <span>Reload view</span>
              </button>

              <button
                onClick={this.handleCopyDetails}
                className="mac-btn focus-ring"
                style={{
                  padding: "7px 14px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-control)",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  border: "1px solid var(--separator)",
                  cursor: "pointer",
                }}
              >
                {this.state.copied ? <Check size={12} style={{ color: "var(--accent-green)" }} /> : <Copy size={12} />}
                <span>{this.state.copied ? "Copied" : "Copy details"}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
