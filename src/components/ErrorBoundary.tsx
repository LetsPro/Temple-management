import { Component, ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-cream-100 px-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🙏</div>
            <h2 className="text-2xl font-bold text-temple-text mb-2">Something went wrong</h2>
            <p className="text-temple-muted mb-6 text-sm leading-relaxed">
              We encountered an unexpected error. Please try refreshing the page or go back to the home page.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
                className="btn-primary"
              >
                Refresh Page
              </button>
              <Link to="/" className="btn-secondary">Go Home</Link>
            </div>
          {(import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV && this.state.error && (
              <pre className="mt-6 text-left bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700 overflow-auto">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
