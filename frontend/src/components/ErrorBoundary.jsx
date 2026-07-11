import { reportClientError } from '../lib/monitor.js';
import { Component } from 'react';

/**
 * Catches render/lifecycle errors anywhere below it so a single failing screen
 * (e.g. a map running out of WebGL contexts) can never blank the whole app.
 * Resets automatically when `resetKey` changes — i.e. when the user navigates —
 * so recovery is as simple as going to another screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    try { reportClientError(error?.message || 'ErrorBoundary', error?.stack); } catch (_) {}
    // eslint-disable-next-line no-console
    console.error('Tabibo UI error:', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, sans-serif', background: '#F4F8F5' }}>
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{ color: '#16A06A', marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3v5a4 4 0 0 0 8 0V3" /><path d="M8 15a6 6 0 0 0 12 0v-3" /><circle cx="20" cy="9" r="2" /></svg>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#15314A', margin: '0 0 8px' }}>Une erreur est survenue</h2>
            <p style={{ fontSize: 14, color: '#6B7B76', lineHeight: 1.6, margin: '0 0 20px' }}>
              Une partie de la page n’a pas pu s’afficher. Vous pouvez recharger l’application.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ background: 'linear-gradient(135deg, #1AAE74 0%, #12875A 52%, #0B6A46 100%)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 18px -6px rgba(22,160,106,0.5)' }}
            >
              Recharger l’application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
