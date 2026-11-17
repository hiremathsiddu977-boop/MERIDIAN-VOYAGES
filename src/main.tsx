import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class PortalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message:
        error instanceof Error
          ? error.message
          : 'An unexpected display error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
          <div className="max-w-md rounded-3xl border border-white/15 bg-slate-900/90 p-8 text-center shadow-2xl">
            <h1 className="font-display text-3xl font-semibold text-white">
              Meridian Voyages
            </h1>
            <p className="mt-3 text-sm text-slate-300">
              {this.state.message || 'The view encountered an error.'}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.href = '/';
              }}
              className="mt-6 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-100"
            >
              Return to Storefront
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <PortalErrorBoundary>
    <App />
  </PortalErrorBoundary>
);
