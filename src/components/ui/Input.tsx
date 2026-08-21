'use client'

import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', style = {}, ...props }, ref) => {
    return (
      <div className="form-group" style={{ marginBottom: '1rem', width: '100%' }}>
        {label && (
          <label
            className="form-label"
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#a1a1aa',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.35rem',
            }}
          >
            {label}
          </label>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {icon && (
            <div
              style={{
                position: 'absolute',
                left: '0.75rem',
                color: '#71717a',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`form-input ${className}`}
            style={{
              width: '100%',
              padding: icon ? '0.65rem 0.9rem 0.65rem 2.4rem' : '0.65rem 0.9rem',
              backgroundColor: '#09090b',
              border: `1px solid ${error ? '#ef4444' : '#3f3f46'}`,
              borderRadius: '12px',
              color: '#f4f4f5',
              fontSize: '0.85rem',
              transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
              ...style,
            }}
            {...props}
          />
        </div>
        {error ? (
          <span style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.25rem', display: 'block' }}>
            {error}
          </span>
        ) : helperText ? (
          <span style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '0.25rem', display: 'block' }}>
            {helperText}
          </span>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options?: { value: string | number; label: string }[]
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, children, className = '', style = {}, ...props }, ref) => {
    return (
      <div className="form-group" style={{ marginBottom: '1rem', width: '100%' }}>
        {label && (
          <label
            className="form-label"
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#a1a1aa',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.35rem',
            }}
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`form-select ${className}`}
          style={{
            width: '100%',
            padding: '0.65rem 0.9rem',
            backgroundColor: '#09090b',
            border: `1px solid ${error ? '#ef4444' : '#3f3f46'}`,
            borderRadius: '12px',
            color: '#f4f4f5',
            fontSize: '0.85rem',
            transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            ...style,
          }}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && (
          <span style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.25rem', display: 'block' }}>
            {error}
          </span>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
