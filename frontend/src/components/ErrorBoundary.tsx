import { AlertTriangle, Home, RotateCcw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  errorMessage: string
}

/**
 * Top-level ErrorBoundary preventing white-screen crashes on unexpected render errors.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message || 'Unexpected rendering error' }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ClaimLedger UI ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
          <div className="max-w-md rounded-3xl border border-rose-200 bg-surface p-8 text-center shadow-sm space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
              <AlertTriangle size={24} />
            </div>
            <h1 className="font-display text-xl font-bold text-[#0A1F36]">
              Something interrupted this view
            </h1>
            <p className="text-xs leading-relaxed text-muted">
              {this.state.errorMessage}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, errorMessage: '' })
                  window.location.reload()
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-xs font-bold text-white hover:bg-navy-soft cursor-pointer"
              >
                <RotateCcw size={14} /> Reload Page
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-canvas px-4 py-2 text-xs font-semibold text-ink hover:bg-slate-100"
              >
                <Home size={14} /> Back Home
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
