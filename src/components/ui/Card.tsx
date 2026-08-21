'use client'

import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
  elevated?: boolean
}

export function Card({
  children,
  interactive = false,
  elevated = false,
  className = '',
  style = {},
  ...props
}: CardProps) {
  return (
    <div
      className={`card ${interactive ? 'card-interactive' : ''} ${className}`}
      style={{
        backgroundColor: elevated ? '#27272a' : '#18181b',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
        overflow: 'hidden',
        transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  children,
  className = '',
  style = {},
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`card-header ${className}`}
      style={{
        padding: '1rem 1.25rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({
  children,
  className = '',
  style = {},
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`card-title ${className}`}
      style={{
        fontSize: '1rem',
        fontWeight: 700,
        color: '#f4f4f5',
        margin: 0,
        fontFamily: "'Inter', sans-serif",
        letterSpacing: '-0.01em',
        ...style,
      }}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardDescription({
  children,
  className = '',
  style = {},
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      style={{
        fontSize: '0.8rem',
        color: '#a1a1aa',
        margin: '0.2rem 0 0 0',
        lineHeight: 1.4,
        ...style,
      }}
      {...props}
    >
      {children}
    </p>
  )
}

export function CardContent({
  children,
  className = '',
  style = {},
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`card-body ${className}`}
      style={{
        padding: '1.25rem',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardFooter({
  children,
  className = '',
  style = {},
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        padding: '0.85rem 1.25rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        backgroundColor: 'rgba(9, 9, 11, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
