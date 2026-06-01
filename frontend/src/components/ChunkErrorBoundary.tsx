import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches chunk/module load failures from React.lazy() and offers a retry.
 * When a lazy import fails (stale cache, network error, new deployment),
 * this boundary shows a friendly message instead of a white screen.
 */
export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ChunkErrorBoundary] Lazy load failed:", error, info);

    // If this is a chunk load error (dynamic import failure), try clearing
    // the service worker cache and reloading once automatically.
    const isChunkError =
      error.name === "ChunkLoadError" ||
      error.message.includes("Failed to fetch dynamically imported module") ||
      error.message.includes("Loading chunk") ||
      error.message.includes("Loading CSS chunk") ||
      error.message.includes("Importing a module script failed");

    if (isChunkError && !sessionStorage.getItem("chunk_retry")) {
      sessionStorage.setItem("chunk_retry", "1");
      // Clear SW caches and reload
      if ("caches" in window) {
        caches.keys().then((names) => {
          for (const name of names) caches.delete(name);
        });
      }
      window.location.reload();
      return;
    }
  }

  handleRetry = (): void => {
    sessionStorage.removeItem("chunk_retry");
    // Clear SW caches
    if ("caches" in window) {
      caches.keys().then((names) => {
        for (const name of names) caches.delete(name);
      });
    }
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "#334155",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.95rem", color: "#64748b", maxWidth: 420, marginBottom: "1.5rem" }}>
            A new version may have been deployed. Click below to reload with the latest code.
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: "0.6rem 1.5rem",
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "#fff",
              backgroundColor: "#4F46E5",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
            }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
