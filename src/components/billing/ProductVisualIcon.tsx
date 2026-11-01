'use client'

import React from 'react'
import { Droplet, Snowflake, Box, Layers, Package, Sparkles } from 'lucide-react'

interface ProductVisualIconProps {
  productName: string
  category?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function ProductVisualIcon({
  productName,
  category = '',
  size = 'md',
  className = ''
}: ProductVisualIconProps) {
  const nameLower = productName.toLowerCase()
  const catLower = category.toLowerCase()

  const isCoolingCan = nameLower.includes('cool') || nameLower.includes('chilled')
  const isCan = nameLower.includes('can') || catLower.includes('can')
  const isBottle = nameLower.includes('bottle') || catLower.includes('bottle')
  const isPacket = nameLower.includes('packet') || nameLower.includes('pouch') || nameLower.includes('bag') || catLower.includes('packet')

  // Dimensions
  const dim = size === 'sm' ? 36 : size === 'md' ? 52 : size === 'lg' ? 68 : 84
  const iconSize = size === 'sm' ? 18 : size === 'md' ? 24 : size === 'lg' ? 32 : 40

  if (isCoolingCan) {
    return (
      <div
        className={className}
        style={{
          width: `${dim}px`,
          height: `${dim}px`,
          borderRadius: size === 'sm' ? '8px' : '14px',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
          border: '1.5px solid rgba(6, 182, 212, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          flexShrink: 0,
          boxShadow: '0 4px 14px rgba(6, 182, 212, 0.15)'
        }}
      >
        <Snowflake style={{ width: `${iconSize}px`, height: `${iconSize}px`, color: '#38bdf8' }} />
        {size !== 'sm' && (
          <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.04em', marginTop: '2px' }}>
            20L COOL
          </span>
        )}
      </div>
    )
  }

  if (isCan) {
    return (
      <div
        className={className}
        style={{
          width: `${dim}px`,
          height: `${dim}px`,
          borderRadius: size === 'sm' ? '8px' : '14px',
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(251, 191, 36, 0.1) 100%)',
          border: '1.5px solid rgba(37, 99, 235, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          flexShrink: 0,
          boxShadow: '0 4px 14px rgba(37, 99, 235, 0.15)'
        }}
      >
        <Droplet style={{ width: `${iconSize}px`, height: `${iconSize}px`, color: '#60a5fa', fill: 'rgba(96, 165, 250, 0.25)' }} />
        {size !== 'sm' && (
          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#fbbf24', letterSpacing: '0.04em', marginTop: '2px' }}>
            20L CAN
          </span>
        )}
      </div>
    )
  }

  if (isBottle) {
    // Check volume (500ml, 1L, 2L)
    const bottleType = nameLower.includes('500ml') ? '24x 500ml' : nameLower.includes('1l') ? '12x 1L' : nameLower.includes('2l') ? '9x 2L' : 'BOTTLE'
    return (
      <div
        className={className}
        style={{
          width: `${dim}px`,
          height: `${dim}px`,
          borderRadius: size === 'sm' ? '8px' : '14px',
          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%)',
          border: '1.5px solid rgba(251, 191, 36, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          flexShrink: 0,
          boxShadow: '0 4px 14px rgba(251, 191, 36, 0.12)'
        }}
      >
        <Box style={{ width: `${iconSize}px`, height: `${iconSize}px`, color: '#fbbf24' }} />
        {size !== 'sm' && (
          <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#34d399', letterSpacing: '0.02em', marginTop: '2px', textAlign: 'center', lineHeight: 1 }}>
            {bottleType}
          </span>
        )}
      </div>
    )
  }

  if (isPacket) {
    return (
      <div
        className={className}
        style={{
          width: `${dim}px`,
          height: `${dim}px`,
          borderRadius: size === 'sm' ? '8px' : '14px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(6, 182, 212, 0.1) 100%)',
          border: '1.5px solid rgba(16, 185, 129, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          flexShrink: 0,
          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.12)'
        }}
      >
        <Layers style={{ width: `${iconSize}px`, height: `${iconSize}px`, color: '#34d399' }} />
        {size !== 'sm' && (
          <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#34d399', letterSpacing: '0.04em', marginTop: '2px' }}>
            PACKETS
          </span>
        )}
      </div>
    )
  }

  // Default Fallback
  return (
    <div
      className={className}
      style={{
        width: `${dim}px`,
        height: `${dim}px`,
        borderRadius: size === 'sm' ? '8px' : '14px',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
        border: '1.5px solid rgba(255, 255, 255, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0
      }}
    >
      <Package style={{ width: `${iconSize}px`, height: `${iconSize}px`, color: '#e4e4e7' }} />
      {size !== 'sm' && (
        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#a1a1aa', letterSpacing: '0.04em', marginTop: '2px' }}>
          SKU
        </span>
      )}
    </div>
  )
}
