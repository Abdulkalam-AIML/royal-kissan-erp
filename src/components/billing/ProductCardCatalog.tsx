'use client'

import React, { useState, useMemo } from 'react'
import { Product } from '@/lib/types/database'
import { PricingRule, RateSource, resolveProductRate } from '@/lib/pricing/pricing-engine'
import ProductVisualIcon from './ProductVisualIcon'
import { 
  Search, 
  X, 
  SlidersHorizontal, 
  ArrowUpDown, 
  Check, 
  Plus, 
  Package, 
  AlertTriangle,
  Sparkles,
  Droplet
} from 'lucide-react'

interface ProductCardCatalogProps {
  products: Product[]
  cartItems: { product_id?: string | null; product_name: string; quantity: number }[]
  pricingRules: PricingRule[]
  customerId?: string | null
  dealerId?: string | null
  routeId?: string | null
  customerCategory?: string | null
  billDate?: string
  isGstEnabled: boolean
  onAddProduct: (product: Product) => void
}

export default function ProductCardCatalog({
  products,
  cartItems,
  pricingRules,
  customerId = null,
  dealerId = null,
  routeId = null,
  customerCategory = null,
  billDate = new Date().toISOString().split('T')[0],
  isGstEnabled,
  onAddProduct
}: ProductCardCatalogProps) {
  // Discovery & Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [inStockOnly, setInStockOnly] = useState<boolean>(false)
  const [sortBy, setSortBy] = useState<'default' | 'name-asc' | 'price-asc' | 'price-desc' | 'stock-desc'>('default')

  // Categories list derived dynamically
  const categories = useMemo(() => {
    const cats = new Set<string>()
    products.forEach(p => {
      if (p.category) cats.add(p.category)
    })
    return ['all', ...Array.from(cats)]
  }, [products])

  // Get resolved rate helper for a product
  function getResolvedInfo(prod: Product) {
    return resolveProductRate({
      productId: prod.id,
      productName: prod.name,
      defaultRate: Number(prod.default_rate) || 0,
      defaultGstRate: isGstEnabled ? (Number(prod.gst_rate) || 0) : 0,
      unit: prod.unit || 'piece',
      customerId,
      dealerId,
      routeId,
      customerCategory,
      billDate,
      availableRules: pricingRules
    })
  }

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        // Active filter
        if (p.is_active === false) return false

        // Category filter
        if (selectedCategory !== 'all' && (p.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
          return false
        }

        // In Stock filter
        if (inStockOnly && (p.stock_quantity ?? 0) <= 0) {
          return false
        }

        // Search Query (matches name, category, hsn_code, unit)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          const matchName = p.name.toLowerCase().includes(q)
          const matchCategory = (p.category || '').toLowerCase().includes(q)
          const matchHsn = (p.hsn_code || '').toLowerCase().includes(q)
          const matchUnit = (p.unit || '').toLowerCase().includes(q)
          if (!matchName && !matchCategory && !matchHsn && !matchUnit) return false
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'name-asc') {
          return a.name.localeCompare(b.name)
        }
        if (sortBy === 'stock-desc') {
          return (b.stock_quantity ?? 0) - (a.stock_quantity ?? 0)
        }
        if (sortBy === 'price-asc' || sortBy === 'price-desc') {
          const rateA = getResolvedInfo(a).resolvedRate
          const rateB = getResolvedInfo(b).resolvedRate
          return sortBy === 'price-asc' ? rateA - rateB : rateB - rateA
        }
        return 0
      })
  }, [products, selectedCategory, inStockOnly, searchQuery, sortBy, pricingRules, customerId, dealerId, routeId, billDate])

  // Helper for Rate Source Badge
  function renderRateBadge(rateSource: RateSource) {
    let bg = 'rgba(96, 165, 250, 0.12)'
    let border = 'rgba(96, 165, 250, 0.35)'
    let color = '#60a5fa'

    if (rateSource === 'Dealer Rate') {
      bg = 'rgba(251, 191, 36, 0.15)'
      border = '#fbbf24'
      color = '#fbbf24'
    } else if (rateSource === 'Customer Rate') {
      bg = 'rgba(52, 211, 153, 0.15)'
      border = '#34d399'
      color = '#34d399'
    } else if (rateSource === 'Route Rate') {
      bg = 'rgba(167, 139, 250, 0.15)'
      border = '#a78bfa'
      color = '#a78bfa'
    } else if (rateSource === 'Category Rate') {
      bg = 'rgba(244, 114, 182, 0.15)'
      border = '#f472b6'
      color = '#f472b6'
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          fontSize: '0.68rem',
          fontWeight: 800,
          padding: '2px 6px',
          borderRadius: '5px',
          background: bg,
          border: `1px solid ${border}`,
          color: color,
          letterSpacing: '0.02em',
          textTransform: 'uppercase'
        }}
      >
        {rateSource}
      </span>
    )
  }

  // Helper for package details description
  function getPackageDetails(prod: Product) {
    const nameLower = prod.name.toLowerCase()
    if (nameLower.includes('cooling can')) return '20L Chilled Water Dispenser Can'
    if (nameLower.includes('can')) return '20L Food-Grade Purified Water Can'
    if (nameLower.includes('500ml')) return 'Case of 24 Packaged Bottles (500ml)'
    if (nameLower.includes('1l')) return 'Case of 12 Packaged Bottles (1000ml)'
    if (nameLower.includes('2l')) return 'Case of 9 Packaged Bottles (2000ml)'
    if (nameLower.includes('packet')) return 'Standard Box of 100 Pouches (500ml)'
    return `Standard Package • Unit: ${prod.unit || 'piece'}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* 1. DISCOVERY & FILTERING TOOLBAR */}
      <div
        style={{
          background: '#121214',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '0.85rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
        }}
      >
        {/* Row 1: Search, Stock Toggle & Sort */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search Box */}
          <div
            style={{
              flex: '1',
              minWidth: '220px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#18181b',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '0.45rem 0.75rem',
              transition: 'border 0.2s'
            }}
          >
            <Search style={{ width: '16px', height: '16px', color: '#fbbf24', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search product name, barcode, SKU or HSN..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: '0.85rem'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: 0 }}
              >
                <X style={{ width: '14px', height: '14px' }} />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* In-Stock Toggle */}
            <button
              type="button"
              onClick={() => setInStockOnly(!inStockOnly)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                border: inStockOnly ? '1.5px solid #34d399' : '1px solid rgba(255, 255, 255, 0.1)',
                background: inStockOnly ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                color: inStockOnly ? '#34d399' : '#a1a1aa',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: inStockOnly ? '#34d399' : '#71717a'
                }}
              />
              In Stock Only
            </button>

            {/* Sort Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ArrowUpDown style={{ width: '14px', height: '14px', color: '#71717a' }} />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                style={{
                  background: '#18181b',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  color: '#e4e4e7',
                  padding: '0.45rem 0.65rem',
                  fontSize: '0.8rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="default">Sort: Default</option>
                <option value="name-asc">Sort: Name (A - Z)</option>
                <option value="price-asc">Sort: Price (Low → High)</option>
                <option value="price-desc">Sort: Price (High → Low)</option>
                <option value="stock-desc">Sort: Stock Level</option>
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Category Pills */}
        <div style={{ display: 'flex', gap: '0.45rem', overflowX: 'auto', paddingBottom: '2px' }}>
          {categories.map(cat => {
            const isSelected = selectedCategory === cat
            const label = cat === 'all' ? 'All Products' : cat === 'Can' ? 'Water Cans (20L)' : cat === 'Bottle' ? 'Bottled Water' : cat === 'Packet' ? 'Water Pouches' : cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '0.35rem 0.8rem',
                  borderRadius: '20px',
                  border: isSelected ? '1.5px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isSelected ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: isSelected ? '#fbbf24' : '#a1a1aa',
                  fontSize: '0.78rem',
                  fontWeight: isSelected ? 800 : 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s'
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. VISUAL PRODUCT CARDS GRID */}
      {filteredProducts.length === 0 ? (
        <div
          style={{
            border: '1px dashed rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '3rem 1rem',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.01)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <Package style={{ width: '40px', height: '40px', color: '#71717a' }} />
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#e4e4e7' }}>
            No products match your current search or filters
          </div>
          <p style={{ color: '#71717a', fontSize: '0.8rem', margin: 0 }}>
            Try clearing the search query or changing the category filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory('all')
              setInStockOnly(false)
            }}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(251, 191, 36, 0.5)',
              background: 'rgba(251, 191, 36, 0.1)',
              color: '#fbbf24',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Reset Catalog Filters
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '0.85rem'
          }}
        >
          {filteredProducts.map(product => {
            const res = getResolvedInfo(product)
            const cartItem = cartItems.find(i => i.product_id === product.id || i.product_name === product.name)
            const inCartQty = cartItem?.quantity || 0

            const stock = product.stock_quantity ?? 0
            const isOutOfStock = stock <= 0
            const isLowStock = stock > 0 && stock < 10

            return (
              <div
                key={product.id}
                style={{
                  background: '#121214',
                  border: inCartQty > 0 ? '1.5px solid rgba(251, 191, 36, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  position: 'relative',
                  boxShadow: inCartQty > 0 ? '0 4px 20px rgba(251, 191, 36, 0.12)' : '0 4px 14px rgba(0,0,0,0.25)',
                  transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  if (inCartQty === 0) e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.4)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  if (inCartQty === 0) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                }}
              >
                {/* Top: Category & Stock Indicator */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem' }}>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: '#a1a1aa',
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      textTransform: 'uppercase'
                    }}
                  >
                    {product.category || 'Standard'}
                  </span>

                  {/* Stock Status Badge */}
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: isOutOfStock ? 'rgba(239, 68, 68, 0.15)' : isLowStock ? 'rgba(245, 158, 11, 0.15)' : 'rgba(52, 211, 153, 0.12)',
                      color: isOutOfStock ? '#ef4444' : isLowStock ? '#fbbf24' : '#34d399',
                      border: `1px solid ${isOutOfStock ? '#ef4444' : isLowStock ? '#fbbf24' : '#34d399'}`
                    }}
                  >
                    <span
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: isOutOfStock ? '#ef4444' : isLowStock ? '#fbbf24' : '#34d399'
                      }}
                    />
                    {isOutOfStock ? 'Out of Stock' : `${stock} ${product.unit || 'units'}`}
                  </span>
                </div>

                {/* Center: Visual Artwork + Title & Specs */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <ProductVisualIcon
                    productName={product.name}
                    category={product.category}
                    size="md"
                  />
                  <div style={{ flex: '1', minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        color: '#fff',
                        fontSize: '0.92rem',
                        lineHeight: 1.25,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      title={product.name}
                    >
                      {product.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#a1a1aa', marginTop: '2px', lineHeight: 1.2 }}>
                      {getPackageDetails(product)}
                    </div>
                  </div>
                </div>

                {/* Price & Rate Source */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    padding: '0.5rem 0.65rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 600 }}>
                      Applicable Rate
                    </div>
                    <div className="num" style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fbbf24', lineHeight: 1.1 }}>
                      ₹{res.resolvedRate}
                      <span style={{ fontSize: '0.7rem', color: '#a1a1aa', fontWeight: 400, marginLeft: '3px' }}>
                        /{product.unit || 'unit'}
                      </span>
                    </div>
                  </div>
                  <div>
                    {renderRateBadge(res.rateSource)}
                  </div>
                </div>

                {/* Bottom: In-Cart Counter & Primary Action Button */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {inCartQty > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#34d399'
                      }}
                    >
                      <Check style={{ width: '13px', height: '13px' }} />
                      <span>{inCartQty} in Bill</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onAddProduct(product)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: inCartQty > 0 ? '#fbbf24' : 'rgba(251, 191, 36, 0.15)',
                      color: inCartQty > 0 ? '#000' : '#fbbf24',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#fbbf24'
                      e.currentTarget.style.color = '#000'
                    }}
                    onMouseLeave={e => {
                      if (inCartQty === 0) {
                        e.currentTarget.style.background = 'rgba(251, 191, 36, 0.15)'
                        e.currentTarget.style.color = '#fbbf24'
                      }
                    }}
                  >
                    <Plus style={{ width: '14px', height: '14px' }} />
                    {inCartQty > 0 ? '+ Add More' : '+ ADD TO BILL'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
