'use client'

import React from 'react'
import { RefreshCw } from 'lucide-react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  loading?: boolean
  fullWidth?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      icon,
      loading = false,
      fullWidth = false,
      disabled,
      className = '',
      style = {},
      ...props
    },
    ref
  ) => {
    let variantStyles: React.CSSProperties = {}
    if (variant === 'primary') {
      variantStyles = {
        backgroundColor: '#fbbf24',
        color: '#000000',
        fontWeight: 700,
        border: '1px solid #f59e0b',
        boxShadow: '0 2px 8px rgba(251, 191, 36, 0.25)',
      }
    } else if (variant === 'secondary') {
      variantStyles = {
        backgroundColor: '#27272a',
        color: '#f4f4f5',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }
    } else if (variant === 'danger') {
      variantStyles = {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        color: '#f87171',
        border: '1px solid rgba(239, 68, 68, 0.3)',
      }
    } else if (variant === 'outline') {
      variantStyles = {
        backgroundColor: 'transparent',
        color: '#f4f4f5',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }
    } else if (variant === 'ghost') {
      variantStyles = {
        backgroundColor: 'transparent',
        color: '#a1a1aa',
        border: '1px solid transparent',
      }
    }

    let sizeStyles: React.CSSProperties = {}
    if (size === 'sm') {
      sizeStyles = { padding: '0.35rem 0.75rem', fontSize: '0.75rem', height: '32px' }
    } else if (size === 'lg') {
      sizeStyles = { padding: '0.75rem 1.5rem', fontSize: '1rem', height: '48px' }
    } else {
      sizeStyles = { padding: '0.55rem 1.1rem', fontSize: '0.85rem', height: '40px' }
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`btn btn-${variant} ${className}`}
        style={{
          borderRadius: '12px',
          fontFamily: "'Inter', sans-serif",
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          opacity: disabled || loading ? 0.6 : 1,
          width: fullWidth ? '100%' : 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          whiteSpace: 'nowrap',
          transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
          ...variantStyles,
          ...sizeStyles,
          ...style,
        }}
        {...props}
      >
        {loading ? (
          <RefreshCw className="animate-spin" style={{ width: '16px', height: '16px' }} />
        ) : (
          icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>
        )}
        <span>{children}</span>
      </button>
    )
  }
)

Button.displayName = 'Button'
