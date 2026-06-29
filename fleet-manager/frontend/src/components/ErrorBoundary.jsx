// ─────────────────────────────────────────────────────────────
// Catches unexpected render errors anywhere in the app and shows a friendly
// message + a reload button, instead of a blank white screen.
// ─────────────────────────────────────────────────────────────
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('App error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-full items-center justify-center p-6">
          <div className="card max-w-sm p-6 text-center">
            <div className="text-4xl">⚠️</div>
            <h1 className="mt-2 text-lg font-semibold">Something went wrong</h1>
            <p className="mt-1 text-sm text-slate-500">
              The app hit an unexpected error. Reloading usually fixes it.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary mt-4 w-full"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
