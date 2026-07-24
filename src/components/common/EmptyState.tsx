'use client'

import React from 'react'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({
  icon = '📭',
  title,
  description,
  actionLabel,
  onAction
}: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1.5rem',
      textAlign: 'center',
      background: 'rgba(16, 14, 10, 0.4)',
      border: '1px dashed rgba(201, 162, 39, 0.2)',
      borderRadius: '1rem',
      margin: '1rem 0'
    }}>
      <div style={{
        fontSize: '2.5rem',
        marginBottom: '0.75rem',
        filter: 'drop-shadow(0 4px 10px rgba(201, 162, 39, 0.2))'
      }}>
        {icon}
      </div>
      <h4 style={{
        margin: '0 0 0.375rem',
        fontSize: '1.1rem',
        fontWeight: '700',
        color: '#f3f1ec'
      }}>
        {title}
      </h4>
      {description && (
        <p style={{
          margin: '0 0 1.25rem',
          fontSize: '0.8125rem',
          color: '#a39f93',
          maxWidth: '360px',
          lineHeight: 1.5
        }}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          className="btn btn-primary btn-sm"
          onClick={onAction}
          style={{ borderRadius: '0.5rem', fontWeight: '700' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
