'use client'

import React from 'react'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
}

export function Skeleton({
  width = '100%',
  height = '20px',
  borderRadius = '6px',
  className = '',
  style = {},
  ...props
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: '#27272a',
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        ...style,
      }}
      {...props}
    />
  )
}

export function SkeletonCard() {
  return (
    <div
      style={{
        backgroundColor: '#18181b',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width="40%" height="16px" />
        <Skeleton width="24px" height="24px" borderRadius="50%" />
      </div>
      <Skeleton width="60%" height="32px" />
      <Skeleton width="30%" height="14px" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div
      style={{
        backgroundColor: '#18181b',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
        <Skeleton width="20%" height="20px" />
        <Skeleton width="30%" height="20px" />
        <Skeleton width="25%" height="20px" />
        <Skeleton width="25%" height="20px" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Skeleton width="20%" height="16px" />
          <Skeleton width="30%" height="16px" />
          <Skeleton width="25%" height="16px" />
          <Skeleton width="25%" height="16px" />
        </div>
      ))}
    </div>
  )
}
