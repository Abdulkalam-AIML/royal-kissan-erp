'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  PricingRule, 
  PricingRuleType, 
  RateSource 
} from '@/lib/pricing/pricing-engine'
import { 
  fetchPricingRules, 
  savePricingRule, 
  togglePricingRuleActive, 
  fetchPricingAuditLogs, 
  detectPricingConflictsAndGaps,
  PricingAuditLogEntry,
  PricingConflictOrGap 
} from '@/lib/services/pricing-service'
import { 
  Tag, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Building2, 
  Users, 
  Truck, 
  Layers, 
  History, 
  Edit3, 
  Trash2, 
  Power, 
  ShieldCheck, 
  Check, 
  X,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Product, Customer, Dealer, Route } from '@/lib/types/database'
import { formatCurrency } from '@/lib/utils/formatters'

export default function RatesManagementPage() {
  const [activeTab, setActiveTab] = useState<'rules' | 'health' | 'audit'>('rules')
  const [rules, setRules] = useState<PricingRule[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [dealers, setDealers] = useState<Dealer[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [auditLogs, setAuditLogs] = useState<PricingAuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedScope, setSelectedScope] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null)
  const [formData, setFormData] = useState({
    product_id: '',
    rule_type: 'default' as PricingRuleType,
    customer_id: '',
    dealer_id: '',
    route_id: '',
    customer_category: '',
    unit: 'piece',
    selling_rate: '',
    is_tax_inclusive: false,
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
    is_active: true,
    reason: '',
    admin_name: 'Admin'
  })

  const supabase = createClient()

  // Load all pricing data
  async function loadData() {
    setLoading(true)
    try {
      const [fetchedRules, prodRes, custRes, dlrRes, rteRes, logs] = await Promise.all([
        fetchPricingRules(),
        supabase.from('products').select('*').order('name'),
        supabase.from('customers').select('*').order('name'),
        supabase.from('dealers').select('*').order('name'),
        supabase.from('routes').select('*').order('name'),
        fetchPricingAuditLogs(80)
      ])

      setRules(fetchedRules)
      if (prodRes.data) setProducts(prodRes.data)
      if (custRes.data) setCustomers(custRes.data)
      if (dlrRes.data) setDealers(dlrRes.data)
      if (rteRes.data) setRoutes(rteRes.data)
      setAuditLogs(logs)
    } catch (err) {
      console.error('Error loading rate management data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Health check scan
  const healthIssues = useMemo(() => {
    return detectPricingConflictsAndGaps(products, rules)
  }, [products, rules])

  // Filtered Rules
  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      // Scope filter
      if (selectedScope !== 'all' && r.rule_type !== selectedScope) return false

      // Status filter
      if (selectedStatus === 'active' && !r.is_active) return false
      if (selectedStatus === 'inactive' && r.is_active) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchProd = r.product_name?.toLowerCase().includes(q)
        const matchCust = r.customer_name?.toLowerCase().includes(q)
        const matchDealer = r.dealer_name?.toLowerCase().includes(q)
        const matchRoute = r.route_name?.toLowerCase().includes(q)
        const matchType = r.rule_type.toLowerCase().includes(q)
        if (!matchProd && !matchCust && !matchDealer && !matchRoute && !matchType) return false
      }

      return true
    })
  }, [rules, selectedScope, selectedStatus, searchQuery])

  // Metrics
  const totalRules = rules.length
  const activeRules = rules.filter(r => r.is_active).length
  const dealerRules = rules.filter(r => r.rule_type === 'dealer').length
  const routeRules = rules.filter(r => r.rule_type === 'route').length
  const defaultRules = rules.filter(r => r.rule_type === 'default').length

  // Open modal for new rule
  function handleOpenCreateModal(presetProdId?: string, presetScope?: PricingRuleType) {
    setEditingRule(null)
    setFormData({
      product_id: presetProdId || (products[0]?.id || ''),
      rule_type: presetScope || 'default',
      customer_id: '',
      dealer_id: '',
      route_id: '',
      customer_category: '',
      unit: 'piece',
      selling_rate: '',
      is_tax_inclusive: false,
      effective_from: new Date().toISOString().split('T')[0],
      effective_to: '',
      is_active: true,
      reason: 'Rate setup',
      admin_name: 'Admin'
    })
    setIsModalOpen(true)
  }

  // Open modal for edit
  function handleOpenEditModal(rule: PricingRule) {
    setEditingRule(rule)
    setFormData({
      product_id: rule.product_id,
      rule_type: rule.rule_type,
      customer_id: rule.customer_id || '',
      dealer_id: rule.dealer_id || '',
      route_id: rule.route_id || '',
      customer_category: rule.category || rule.customer_category || '',
      unit: rule.unit || 'piece',
      selling_rate: String(rule.selling_rate),
      is_tax_inclusive: Boolean(rule.is_tax_inclusive),
      effective_from: rule.effective_from,
      effective_to: rule.effective_to || '',
      is_active: rule.is_active,
      reason: 'Rate adjustment',
      admin_name: 'Admin'
    })
    setIsModalOpen(true)
  }

  // Save rule handler
  async function handleSaveRule() {
    if (!formData.product_id) {
      alert('Please select a product.')
      return
    }
    const rateNum = Number(formData.selling_rate)
    if (isNaN(rateNum) || rateNum <= 0) {
      alert('Please enter a valid positive selling rate (greater than 0).')
      return
    }
    if (!formData.reason.trim()) {
      alert('Please specify an audit reason for this rate change.')
      return
    }

    // Determine target names
    const prodObj = products.find(p => p.id === formData.product_id)
    const custObj = customers.find(c => c.id === formData.customer_id)
    const dlrObj = dealers.find(d => d.id === formData.dealer_id)
    const rteObj = routes.find(r => r.id === formData.route_id)

    setActionLoading(true)
    try {
      await savePricingRule(
        {
          id: editingRule?.id,
          product_id: formData.product_id,
          product_name: prodObj?.name,
          rule_type: formData.rule_type,
          customer_id: formData.rule_type === 'customer' ? formData.customer_id : undefined,
          customer_name: custObj?.name,
          dealer_id: formData.rule_type === 'dealer' ? formData.dealer_id : undefined,
          dealer_name: dlrObj?.name,
          route_id: formData.rule_type === 'route' ? formData.route_id : undefined,
          route_name: rteObj?.name,
          category: formData.rule_type === 'category' ? formData.customer_category : undefined,
          unit: formData.unit || prodObj?.unit || 'piece',
          selling_rate: rateNum,
          is_tax_inclusive: formData.is_tax_inclusive,
          effective_from: formData.effective_from,
          effective_to: formData.effective_to || null,
          is_active: formData.is_active
        },
        formData.admin_name,
        formData.reason
      )

      setIsModalOpen(false)
      await loadData()
    } catch (err: any) {
      alert(`Error saving rate rule: ${err.message || err}`)
    } finally {
      setActionLoading(false)
    }
  }

  // Toggle active handler
  async function handleToggleActive(rule: PricingRule) {
    if (!rule.id) return
    const nextStatus = !rule.is_active
    const confirmMsg = `Are you sure you want to ${nextStatus ? 'activate' : 'deactivate'} rate for ${rule.product_name} (${rule.rule_type})?`
    if (!confirm(confirmMsg)) return

    setActionLoading(true)
    try {
      await togglePricingRuleActive(
        rule.id, 
        nextStatus, 
        'Admin', 
        nextStatus ? 'Re-activated rule' : 'Deactivated rule'
      )
      await loadData()
    } catch (err: any) {
      alert(`Error updating rule: ${err.message || err}`)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      {/* 1. PAGE HEADER & PRICING HIERARCHY PILL */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '1rem',
        background: '#121214',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(251, 191, 36, 0.15)',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Tag style={{ width: '18px', height: '18px' }} />
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
              Central Rate Management & Pricing Engine
            </h1>
            <span style={{
              background: 'rgba(52, 211, 153, 0.12)',
              border: '1px solid #34d399',
              color: '#34d399',
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '0.2rem 0.5rem',
              borderRadius: '6px',
              textTransform: 'uppercase'
            }}>
              Authoritative V2
            </span>
          </div>
          <p style={{ margin: 0, color: '#a1a1aa', fontSize: '0.82rem', maxWidth: '720px' }}>
            All billing modules (Counter, Customer, Dealer, Route Sales) query this unified rate engine. Rates adhere to the deterministic priority: <strong style={{ color: '#fbbf24' }}>1. Customer/Dealer Specific → 2. Route Specific → 3. Customer Category → 4. Base Default</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={loadData}
            icon={<RefreshCw style={{ width: '15px', height: '15px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />}
          >
            Refresh
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => handleOpenCreateModal()}
            icon={<Plus style={{ width: '16px', height: '16px' }} />}
            style={{ fontWeight: 800 }}
          >
            + Add / Schedule Rate Rule
          </Button>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.85rem'
      }}>
        <div style={{
          background: '#121214',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '10px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem'
        }}>
          <div style={{ fontSize: '0.72rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>
            Total Active Rates
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
            {activeRules} <span style={{ fontSize: '0.85rem', color: '#71717a', fontWeight: 400 }}>/ {totalRules}</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <ShieldCheck style={{ width: '13px', height: '13px' }} /> Canonical rules loaded
          </div>
        </div>

        <div style={{
          background: '#121214',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '10px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem'
        }}>
          <div style={{ fontSize: '0.72rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>
            Base Product Rates
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#60a5fa' }}>
            {defaultRules}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>
            Catalog default fallbacks
          </div>
        </div>

        <div style={{
          background: '#121214',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '10px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem'
        }}>
          <div style={{ fontSize: '0.72rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>
            Dealer Wholesale Rates
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24' }}>
            {dealerRules}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>
            Priority 1 tier wholesale
          </div>
        </div>

        <div style={{
          background: '#121214',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '10px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem'
        }}>
          <div style={{ fontSize: '0.72rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>
            Route Delivery Rates
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#a78bfa' }}>
            {routeRules}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>
            Priority 2 truck run stops
          </div>
        </div>

        <div style={{
          background: '#121214',
          border: `1px solid ${healthIssues.length > 0 ? '#ef4444' : 'rgba(52, 211, 153, 0.4)'}`,
          borderRadius: '10px',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem'
        }}>
          <div style={{ fontSize: '0.72rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>
            Pricing Integrity
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: healthIssues.length > 0 ? '#ef4444' : '#34d399' }}>
            {healthIssues.length === 0 ? 'Optimal' : `${healthIssues.length} Issues`}
          </div>
          <div style={{ fontSize: '0.7rem', color: healthIssues.length > 0 ? '#f87171' : '#34d399' }}>
            {healthIssues.length === 0 ? 'No conflicts or 0.00 rates' : 'Action needed in Health tab'}
          </div>
        </div>
      </div>

      {/* 3. TABS NAVIGATION */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: '0.5rem'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          style={{
            padding: '0.6rem 1.1rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'rules' ? 'rgba(251,191,36,0.15)' : 'transparent',
            color: activeTab === 'rules' ? '#fbbf24' : '#a1a1aa',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Layers style={{ width: '15px', height: '15px' }} />
          Rate Rules Directory ({filteredRules.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('health')}
          style={{
            padding: '0.6rem 1.1rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'health' ? (healthIssues.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.15)') : 'transparent',
            color: activeTab === 'health' ? (healthIssues.length > 0 ? '#ef4444' : '#34d399') : (healthIssues.length > 0 ? '#ef4444' : '#a1a1aa'),
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {healthIssues.length > 0 ? (
            <AlertTriangle style={{ width: '15px', height: '15px' }} />
          ) : (
            <CheckCircle2 style={{ width: '15px', height: '15px' }} />
          )}
          Rate Health & Diagnostics ({healthIssues.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '0.6rem 1.1rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'audit' ? 'rgba(251,191,36,0.15)' : 'transparent',
            color: activeTab === 'audit' ? '#fbbf24' : '#a1a1aa',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <History style={{ width: '15px', height: '15px' }} />
          Audit Trail & History ({auditLogs.length})
        </button>
      </div>

      {/* 4. TAB CONTENT 1: RATE RULES DIRECTORY */}
      {activeTab === 'rules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Controls Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            background: '#121214',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px',
            padding: '0.75rem 1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', minWidth: '240px' }}>
              <Search style={{ width: '16px', height: '16px', color: '#71717a' }} />
              <input
                type="text"
                placeholder="Search by product, dealer, route, or customer name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: '0.85rem',
                  width: '100%'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#71717a' }}>Scope:</span>
                <select
                  value={selectedScope}
                  onChange={e => setSelectedScope(e.target.value)}
                  style={{
                    background: '#18181b',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '0.35rem 0.6rem',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="all">All Scopes</option>
                  <option value="default">Default Product</option>
                  <option value="dealer">Dealer Wholesale</option>
                  <option value="route">Route Sales</option>
                  <option value="customer">Customer Specific</option>
                  <option value="category">Customer Category</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#71717a' }}>Status:</span>
                <select
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value as any)}
                  style={{
                    background: '#18181b',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '0.35rem 0.6rem',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Rules Table */}
          <div style={{
            background: '#121214',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#71717a' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Product & Unit</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Pricing Scope & Target</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Hierarchy Priority</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Selling Rate</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Tax Configuration</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Validity Period</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Active</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '3rem 1rem', textAlign: 'center', color: '#71717a' }}>
                      No pricing rules match your selected filters. Click "+ Add / Schedule Rate Rule" to define one.
                    </td>
                  </tr>
                ) : (
                  filteredRules.map((rule) => {
                    const isExpired = rule.effective_to && rule.effective_to < new Date().toISOString().split('T')[0]
                    const isFuture = rule.effective_from > new Date().toISOString().split('T')[0]

                    let scopeBadgeColor = '#60a5fa'
                    let scopeLabel = 'Default Catalog'
                    if (rule.rule_type === 'dealer') {
                      scopeBadgeColor = '#fbbf24'
                      scopeLabel = `Dealer: ${rule.dealer_name || 'Wholesale Dealer'}`
                    } else if (rule.rule_type === 'route') {
                      scopeBadgeColor = '#a78bfa'
                      scopeLabel = `Route: ${rule.route_name || 'Truck Route'}`
                    } else if (rule.rule_type === 'customer') {
                      scopeBadgeColor = '#34d399'
                      scopeLabel = `Customer: ${rule.customer_name || 'Account'}`
                    } else if (rule.rule_type === 'category') {
                      scopeBadgeColor = '#f472b6'
                      scopeLabel = `Category: ${rule.category || rule.customer_category || 'Category'}`
                    }

                    return (
                      <tr 
                        key={rule.id} 
                        style={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          opacity: rule.is_active ? 1 : 0.5,
                          background: rule.is_active ? 'transparent' : 'rgba(255,255,255,0.01)'
                        }}
                      >
                        {/* Product & Unit */}
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: '#e4e4e7' }}>{rule.product_name}</div>
                          <span style={{ fontSize: '0.72rem', color: '#a1a1aa', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                            {rule.unit || 'unit'}
                          </span>
                        </td>

                        {/* Pricing Scope & Target */}
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: `rgba(${scopeBadgeColor === '#fbbf24' ? '251,191,36' : scopeBadgeColor === '#a78bfa' ? '167,139,250' : scopeBadgeColor === '#34d399' ? '52,211,153' : '96,165,250'}, 0.12)`,
                            border: `1px solid ${scopeBadgeColor}`,
                            color: scopeBadgeColor,
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            {scopeLabel}
                          </div>
                        </td>

                        {/* Priority */}
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            width: '24px',
                            height: '24px',
                            lineHeight: '24px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.06)',
                            fontWeight: 800,
                            color: '#fff',
                            fontSize: '0.75rem'
                          }}>
                            P{rule.priority}
                          </span>
                        </td>

                        {/* Selling Rate */}
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fbbf24' }}>
                            ₹{rule.selling_rate.toFixed(2)}
                          </span>
                        </td>

                        {/* Tax Configuration */}
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: rule.is_tax_inclusive ? '#34d399' : '#a1a1aa'
                          }}>
                            {rule.is_tax_inclusive ? 'Tax Inclusive (MRP)' : 'Tax Exclusive (GST extra)'}
                          </span>
                        </td>

                        {/* Validity Period */}
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.78rem' }}>
                          <div style={{ color: '#d4d4d8' }}>
                            From: {rule.effective_from}
                          </div>
                          <div style={{ color: rule.effective_to ? (isExpired ? '#f87171' : '#a1a1aa') : '#71717a' }}>
                            To: {rule.effective_to || 'Indefinite'}
                          </div>
                          {isFuture && (
                            <span style={{ color: '#60a5fa', fontSize: '0.7rem', fontWeight: 700 }}>
                              ● Scheduled Future
                            </span>
                          )}
                          {isExpired && (
                            <span style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 700 }}>
                              ● Expired
                            </span>
                          )}
                        </td>

                        {/* Active Toggle */}
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(rule)}
                            style={{
                              border: 'none',
                              background: rule.is_active ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              color: rule.is_active ? '#34d399' : '#ef4444',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <Power style={{ width: '12px', height: '12px' }} />
                            {rule.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </button>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenEditModal(rule)}
                              icon={<Edit3 style={{ width: '13px', height: '13px' }} />}
                            >
                              Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB CONTENT 2: RATE HEALTH & DIAGNOSTICS */}
      {activeTab === 'health' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{
            background: '#121214',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            padding: '1.25rem'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              AUTOMATED FINANCIAL ACCURACY SCANNER
            </div>
            <p style={{ margin: 0, color: '#a1a1aa', fontSize: '0.85rem' }}>
              This audit engine proactively searches for missing rates (products priced at ₹0.00) that would block POS billing, as well as date-overlapping conflicts.
            </p>
          </div>

          {healthIssues.length === 0 ? (
            <div style={{
              background: 'rgba(52, 211, 153, 0.08)',
              border: '1.5px solid #34d399',
              borderRadius: '12px',
              padding: '2.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <CheckCircle2 style={{ width: '48px', height: '48px', color: '#34d399' }} />
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                All Catalog Products Have Verified Non-Zero Rates!
              </div>
              <p style={{ color: '#a1a1aa', fontSize: '0.85rem', maxWidth: '520px', margin: 0 }}>
                No zero-rate products or date collisions were detected. POS operators are protected against silent zero substitutions across Counter, Customer, Dealer, and Route Billing workflows.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {healthIssues.map((issue, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#18181b',
                    border: `1.5px solid ${issue.type === 'zero_rate' ? '#ef4444' : '#fbbf24'}`,
                    borderRadius: '10px',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: issue.type === 'zero_rate' ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.2)',
                      color: issue.type === 'zero_rate' ? '#ef4444' : '#fbbf24',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <AlertTriangle style={{ width: '18px', height: '18px' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>
                        {issue.message}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#a1a1aa', marginTop: '0.2rem' }}>
                        {issue.details}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.2rem', fontWeight: 600 }}>
                        Recommendation: {issue.suggestedAction}
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenCreateModal(issue.productId, 'default')}
                    style={{ fontWeight: 700 }}
                  >
                    Configure Base Rate
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. TAB CONTENT 3: AUDIT TRAIL & HISTORY */}
      {activeTab === 'audit' && (
        <div style={{
          background: '#121214',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#71717a' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Timestamp</th>
                <th style={{ padding: '0.85rem 1rem' }}>Action</th>
                <th style={{ padding: '0.85rem 1rem' }}>Product & Target</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Old Rate</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>New Rate</th>
                <th style={{ padding: '0.85rem 1rem' }}>Changed By</th>
                <th style={{ padding: '0.85rem 1rem' }}>Reason & Justification</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem 1rem', textAlign: 'center', color: '#71717a' }}>
                    No audit records logged yet. All rate creates, updates, and POS cashier overrides are immutably logged here.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.75rem 1rem', color: '#a1a1aa', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        padding: '0.2rem 0.45rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        background: log.action === 'override' ? 'rgba(239,68,68,0.2)' : log.action === 'create' ? 'rgba(52,211,153,0.2)' : 'rgba(251,191,36,0.2)',
                        color: log.action === 'override' ? '#ef4444' : log.action === 'create' ? '#34d399' : '#fbbf24'
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: '#e4e4e7' }}>{log.product_name || 'Product'}</div>
                      <div style={{ fontSize: '0.7rem', color: '#71717a' }}>{log.entity_name}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#71717a' }}>
                      {log.old_rate !== null && log.old_rate !== undefined ? `₹${log.old_rate.toFixed(2)}` : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: '#fbbf24' }}>
                      ₹{log.new_rate.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#d4d4d8' }}>
                      {log.changed_by || 'Admin'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#a1a1aa' }}>
                      {log.reason || 'None specified'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 7. ADD / EDIT RATE RULE MODAL */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#121214',
            border: '1.5px solid rgba(251, 191, 36, 0.4)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(251,191,36,0.05)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                  {editingRule ? 'Edit Rate Rule' : 'Configure New Rate Rule'}
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.2rem' }}>
                  Authoritative Pricing Engine V2
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '75vh', overflowY: 'auto' }}>
              {/* Product */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Product *
                </label>
                <select
                  value={formData.product_id}
                  onChange={e => {
                    const pid = e.target.value
                    const p = products.find(x => x.id === pid)
                    setFormData(prev => ({
                      ...prev,
                      product_id: pid,
                      unit: p?.unit || prev.unit
                    }))
                  }}
                  style={{
                    width: '100%',
                    background: '#18181b',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '0.6rem 0.75rem',
                    fontSize: '0.85rem'
                  }}
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit || 'unit'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Scope & Priority */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Pricing Scope *
                  </label>
                  <select
                    value={formData.rule_type}
                    onChange={e => setFormData(prev => ({ ...prev, rule_type: e.target.value as any }))}
                    style={{
                      width: '100%',
                      background: '#18181b',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '0.6rem 0.75rem',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="default">Default Product Rate (P4)</option>
                    <option value="dealer">Dealer Wholesale Rate (P1)</option>
                    <option value="customer">Customer Specific Rate (P1)</option>
                    <option value="route">Route Sales Rate (P2)</option>
                    <option value="category">Customer Category (P3)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Unit of Measurement
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={e => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="piece, case, box, jar"
                    style={{
                      width: '100%',
                      background: '#18181b',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '0.6rem 0.75rem',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              {/* Entity Selector based on Scope */}
              {formData.rule_type === 'dealer' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#fbbf24', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Select Wholesale Dealer *
                  </label>
                  <select
                    value={formData.dealer_id}
                    onChange={e => setFormData(prev => ({ ...prev, dealer_id: e.target.value }))}
                    style={{
                      width: '100%',
                      background: '#18181b',
                      border: '1px solid #fbbf24',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '0.6rem 0.75rem',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="">-- Choose Dealer --</option>
                    {dealers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.dealer_code ? `[${d.dealer_code}] ` : ''}{d.name} ({d.area || 'Wholesale'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.rule_type === 'customer' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#34d399', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Select Customer Account *
                  </label>
                  <select
                    value={formData.customer_id}
                    onChange={e => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
                    style={{
                      width: '100%',
                      background: '#18181b',
                      border: '1px solid #34d399',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '0.6rem 0.75rem',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone || c.area || 'Retail'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.rule_type === 'route' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#a78bfa', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Select Route *
                  </label>
                  <select
                    value={formData.route_id}
                    onChange={e => setFormData(prev => ({ ...prev, route_id: e.target.value }))}
                    style={{
                      width: '100%',
                      background: '#18181b',
                      border: '1px solid #a78bfa',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '0.6rem 0.75rem',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="">-- Choose Route --</option>
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.area || 'Route'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.rule_type === 'category' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#f472b6', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={formData.customer_category}
                    onChange={e => setFormData(prev => ({ ...prev, customer_category: e.target.value }))}
                    placeholder="e.g. VIP, Hotel, Institutional, Retail"
                    style={{
                      width: '100%',
                      background: '#18181b',
                      border: '1px solid #f472b6',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '0.6rem 0.75rem',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              )}

              {/* Selling Rate & Tax Model */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#fbbf24', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Selling Rate (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.selling_rate}
                    onChange={e => setFormData(prev => ({ ...prev, selling_rate: e.target.value }))}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      background: '#18181b',
                      border: '1px solid rgba(251,191,36,0.6)',
                      borderRadius: '8px',
                      color: '#fbbf24',
                      fontWeight: 800,
                      fontSize: '1rem',
                      padding: '0.55rem 0.75rem'
                    }}
                  />
                </div>

                <div style={{ paddingTop: '1.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', color: formData.is_tax_inclusive ? '#34d399' : '#a1a1aa' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_tax_inclusive}
                      onChange={e => setFormData(prev => ({ ...prev, is_tax_inclusive: e.target.checked }))}
                    />
                    <span>Tax Inclusive (MRP)</span>
                  </label>
                </div>
              </div>

              {/* Effective Dates (Future Scheduling) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Effective From Date *
                  </label>
                  <input
                    type="date"
                    value={formData.effective_from}
                    onChange={e => setFormData(prev => ({ ...prev, effective_from: e.target.value }))}
                    style={{
                      width: '100%',
                      background: '#18181b',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '0.55rem 0.75rem',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#a1a1aa', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Effective To Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.effective_to}
                    onChange={e => setFormData(prev => ({ ...prev, effective_to: e.target.value }))}
                    style={{
                      width: '100%',
                      background: '#18181b',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '0.55rem 0.75rem',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              {/* Audit Reason */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#ef4444', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Reason for Rate Setup / Change * (Audit Compliance)
                </label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g. Raw material price adjustment, wholesale contract renewal"
                  style={{
                    width: '100%',
                    background: '#18181b',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: '#fff',
                    padding: '0.6rem 0.75rem',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              background: '#0d0d0f'
            }}>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                loading={actionLoading}
                onClick={handleSaveRule}
                icon={<Check style={{ width: '15px', height: '15px' }} />}
                style={{ fontWeight: 800 }}
              >
                Save Rate Rule
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
