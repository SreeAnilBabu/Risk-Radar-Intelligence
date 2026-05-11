import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * App-level error boundary. Wraps the router so a render error in any
 * page doesn't white-screen the whole app. Falls back to a minimal
 * "something went wrong" panel with a reload button.
 */
type State = { error: Error | null };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("[RiskRadar] Render error caught by ErrorBoundary:", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div style={{
          padding: 32, maxWidth: 640, margin: "80px auto", fontFamily: "Segoe UI, Arial, sans-serif",
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
        }}>
          <h2 style={{ margin: "0 0 8px", color: "#dc2626" }}>Something went wrong</h2>
          <p style={{ margin: "0 0 12px", color: "#475569", fontSize: 14 }}>
            RiskRadar hit an unexpected error rendering this view. Reload to recover.
          </p>
          <pre style={{
            background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 4,
            padding: 10, fontSize: 12, overflow: "auto", maxHeight: 180, color: "#334155"
          }}>{this.state.error.message}</pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 12, padding: "6px 14px", background: "#1e5f9c", color: "#fff",
              border: "none", borderRadius: 4, fontWeight: 600, cursor: "pointer"
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
