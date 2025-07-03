// frontend/src/components/ErrorBoundary.tsx

import React, { Component, ErrorInfo, ReactNode } from 'react';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // You can also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-container">
            <div className="error-icon">💥</div>
            <h1 className="error-title">Oops! Something went wrong</h1>
            <p className="error-description">
              The Trash to Treasure Rally encountered an unexpected error.
              Don't worry - even garbage chains have hiccups sometimes! 🗑️
            </p>

            <div className="error-actions">
              <button
                onClick={this.handleReset}
                className="error-button primary"
              >
                🔄 Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="error-button secondary"
              >
                🔃 Reload Page
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>🔍 Technical Details (Development Only)</summary>
                <div className="error-stack">
                  <h3>Error:</h3>
                  <pre>{this.state.error.toString()}</pre>

                  {this.state.errorInfo && (
                    <>
                      <h3>Component Stack:</h3>
                      <pre>{this.state.errorInfo.componentStack}</pre>
                    </>
                  )}
                </div>
              </details>
            )}

            <div className="error-footer">
              <p>
                Having persistent issues? Join the Gorbagana community for help:
              </p>
              <div className="error-links">
                <a
                  href="https://t.me/gorbagana"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="error-link"
                >
                  💬 Telegram
                </a>
                <a
                  href="https://twitter.com/Gorbagana_chain"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="error-link"
                >
                  🐦 Twitter
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
