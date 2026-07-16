'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '3rem 2rem',
          borderRadius: '1.5rem',
          background: 'hsl(0 85% 60% / 0.05)',
          border: '1px solid hsl(0 85% 60% / 0.2)',
          textAlign: 'center',
          color: '#fff',
          margin: '2rem 0'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'hsl(0 85% 70%)', margin: '0 0 1rem 0' }}>
            ⚠️ Something Went Wrong
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'hsl(215 20% 65%)', marginBottom: '1.5rem' }}>
            A rendering error occurred while loading this section of the dashboard.
          </p>
          <pre style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '1rem',
            borderRadius: '0.75rem',
            fontSize: '0.8rem',
            textAlign: 'left',
            color: 'hsl(0 85% 75%)',
            overflowX: 'auto',
            maxHeight: '200px',
            fontFamily: 'monospace'
          }}>
            {this.state.error?.toString()}
          </pre>
          <button
            className="btn btn-primary"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: '1.5rem', borderRadius: '0.75rem' }}
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
