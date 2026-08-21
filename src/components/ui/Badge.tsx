'use client'

import React from 'react'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  icon?: React.ReactNode
}

export function Badge({
  children,
  variant = 'neutral',
  icon,
  className = '',
  style = {},
  ...props
}: BadgeProps) {
  let variantStyles: React.CSSProperties = {}

  if (variant === 'success') {
    variantStyles = {
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      color: '#34d399',
      border: '1px solid rgba(16, 185, 129, 0.25)',
    }
  } else if (variant === 'warning') {
    variantStyles = {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      color: '#fbbf24',
      border: '1px solid rgba(245, 158, 11, 0.25)',
    }
  } else if (variant === 'danger') {
    variantStyles = {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      color: '#f87171',
      border: '1px solid rgba(239, 68, 68, 0.25)',
    }
  } else if (variant === 'info') {
    variantStyles = {
      backgroundColor: 'rgba(59, 130, 246, 0.12)',
      color: '#60a5fa',
      border: '1px solid rgba(59, 130, 246, 0.25)',
    }
  } else {
    variantStyles = {
      backgroundColor: '#27272a',
      color: '#a1a1aa',
      border: '1px solid rgba(255, 255, 255, 0.08)',
    }
  }

  return (
    <span
      className={`badge badge-${variant} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.2rem 0.55rem',
        borderRadius: '6px',
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        ...variantStyles,
        ...style,
      }}
      {...props}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span>{children}</span>
    </span>
  )
}
