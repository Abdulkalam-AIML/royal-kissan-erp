'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry
}: ErrorStateProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1.25rem 1.5rem',
      background: 'rgba(239, 68, 68, 0.08)',
      border: '1px solid rgba(239, 68, 68, 0.25)',
      borderRadius: '0.875rem',
      margin: '1rem 0',
      flexWrap: 'wrap',
      gap: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <AlertTriangle style={{ width: '20px', height: '20px', color: '#f87171' }} />
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.925rem', fontWeight: '700', color: '#f87171' }}>
            {title}
          </h4>
          <p style={{ margin: '0.125rem 0 0', fontSize: '0.8rem', color: '#a39f93' }}>
            {message}
          </p>
        </div>
      </div>

      {onRetry && (
        <button
          className="btn btn-secondary btn-sm"
          onClick={onRetry}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            color: '#f87171'
          }}
        >
          <RefreshCw style={{ width: '14px', height: '14px' }} />
          <span>Retry</span>
        </button>
      )}
    </div>
  )
}
