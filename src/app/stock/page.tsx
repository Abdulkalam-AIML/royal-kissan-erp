'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { emitDataChange, useDataSyncListener } from '@/lib/events/data-sync'
import { Boxes, Plus, AlertTriangle, ArrowUpRight, ArrowDownLeft, Package, Check, X, Shield } from 'lucide-react'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import { SkeletonTable } from '@/components/ui/Skeleton'

const STOCK_ITEMS = [
  { name: 'Water Cans (20L)',    category: 'product', threshold: 50,   unit: 'cans' },
  { name: 'Cooling Cans (20L)', category: 'product', threshold: 20,   unit: 'cans' },
  { name: 'Water Packets',       category: 'product', threshold: 200,  unit: 'pkts' },
  { name: '250ml Bottle Case',   category: 'product', threshold: 20,   unit: 'cases' },
  { name: '500ml Bottle Case',   category: 'product', threshold: 20,   unit: 'cases' },
  { name: '1L Bottle Case',      category: 'product', threshold: 15,   unit: 'cases' },
  { name: '2L Bottle Case',      category: 'product', threshold: 10,   unit: 'cases' },
  { name: 'Empty Cans',          category: 'raw',     threshold: 30,   unit: 'pcs' },
  { name: 'Caps',                category: 'raw',     threshold: 1000, unit: 'pcs' },
  { name: 'Labels',              category: 'raw',     threshold: 500,  unit: 'pcs' },
  { name: 'Preforms',            category: 'raw',     threshold: 500,  unit: 'pcs' },
  { name: 'Packaging Materials', category: 'raw',     threshold: 10,   unit: 'rolls' },
]

export default function StockPage() {
  const [stockData, setStockData] = useState<Record<string, { opening: number; in: number; out: number; current: number }>>({})
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [txType, setTxType] = useState<'opening' | 'in' | 'out'>('in')
  const [form, setForm] = useState({ item: STOCK_ITEMS[0].name, quantity: 0, notes: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useDataSyncListener(['stock', 'all'], () => { loadStockData() })

  useEffect(() => { loadStockData() }, [])

  async function loadStockData() {
    setLoading(true)
    try {
      const calc: Record<string, { opening: number; in: number; out: number; current: number }> = {}
      STOCK_ITEMS.forEach(item => {
        calc[item.name] = { opening: 100, in: 45, out: 20, current: 125 }
      })

      const { data: allTx } = await supabase.from('stock_transactions').select('*').order('created_at', { ascending: false })
      if (allTx) {
        allTx.forEach(tx => {
          const name = tx.item_name || STOCK_ITEMS.find(i => tx.notes?.includes(`[${i.name}]`))?.name
          if (!name || !calc[name]) return
          const qty = tx.quantity || 0
          if (tx.transaction_type === 'opening') calc[name].opening += qty
          else if (tx.transaction_type === 'in') calc[name].in += qty
          else if (tx.transaction_type === 'out') calc[name].out += qty
        })
        STOCK_ITEMS.forEach(item => {
          const d = calc[item.name]
          d.current = Math.max(0, d.opening + d.in - d.out)
        })
        setStockData(calc)
        setTransactions(allTx)
      } else {
        setStockData(calc)
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false)
    }
  }

  async function saveTransaction() {
    if (form.quantity <= 0) {
      alert('Please enter a valid quantity')
      return
    }
    setSaving(true)
    try {
      const { data } = await supabase.from('stock_transactions').insert([{
        transaction_type: txType,
        quantity: form.quantity,
        item_name: form.item,
        notes: form.notes ? `${form.notes} [${form.item}]` : `[${form.item}]`,
        reference_type: txType === 'opening' ? 'opening_balance' : 'adjustment',
      }]).select().single()

      if (data) {
        setTransactions(prev => [data, ...prev])
      }
      emitDataChange('stock')

      setShowModal(false)
      setForm({ item: STOCK_ITEMS[0].name, quantity: 0, notes: '' })
      loadStockData()
    } catch (err: any) {
      alert(err.message || 'Failed to save stock movement')
    } finally {
      setSaving(false)
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'name',
      title: 'Item Name & Category',
      sortable: true,
      render: (item) => (
        <div>
          <div style={{ fontWeight: 700, color: '#f4f4f5' }}>{item.name}</div>
          <Badge variant={item.category === 'product' ? 'info' : 'neutral'} style={{ marginTop: '0.2rem' }}>
            {item.category === 'product' ? 'Finished Product' : 'Raw Material'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'current',
      title: 'Current Stock',
      align: 'right',
      sortable: true,
      render: (item) => {
        const cur = stockData[item.name]?.current || 0
        const isLow = cur <= item.threshold
        return (
          <div style={{ textAlign: 'right' }}>
            <span className="num" style={{ fontSize: '1.1rem', fontWeight: 800, color: isLow ? '#f87171' : '#34d399' }}>
              {cur} {item.unit}
            </span>
            {isLow && (
              <div style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}>
                <AlertTriangle style={{ width: '11px', height: '11px' }} /> LOW STOCK
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'threshold',
      title: 'Alert Threshold',
      align: 'right',
      render: (item) => (
        <span className="num" style={{ color: '#a1a1aa' }}>{item.threshold} {item.unit}</span>
      ),
    },
    {
      key: 'actions',
      title: 'Stock Adjustment',
      align: 'right',
      render: (item) => (
        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowUpRight style={{ width: '12px', height: '12px', color: '#34d399' }} />}
            onClick={() => {
              setForm({ item: item.name, quantity: 0, notes: '' })
              setTxType('in')
              setShowModal(true)
            }}
          >
            Stock In
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowDownLeft style={{ width: '12px', height: '12px', color: '#f87171' }} />}
            onClick={() => {
              setForm({ item: item.name, quantity: 0, notes: '' })
              setTxType('out')
              setShowModal(true)
            }}
          >
            Stock Out
          </Button>
        </div>
      ),
    },
  ]

  const lowStockCount = STOCK_ITEMS.filter(i => (stockData[i.name]?.current || 0) <= i.threshold).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Boxes style={{ color: '#fbbf24', width: '28px', height: '28px' }} />
            Stock & Inventory Control
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {STOCK_ITEMS.length} inventory items tracked &bull; Low Stock Alerts: {' '}
            <span style={{ color: lowStockCount > 0 ? '#f87171' : '#34d399', fontWeight: 800 }}>
              {lowStockCount} SKUs
            </span>
          </p>
        </div>

        <Button variant="primary" icon={<Plus style={{ width: '16px', height: '16px' }} />} onClick={() => setShowModal(true)}>
          New Stock Adjustment
        </Button>
      </div>

      {/* Main Stock Table */}
      {loading ? (
        <SkeletonTable rows={8} />
      ) : (
        <DataTable
          columns={columns}
          data={STOCK_ITEMS}
          searchPlaceholder="Search inventory by item name or category..."
          exportFileName="royal-kissan-stock-inventory"
        />
      )}

      {/* Adjustment Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff' }}>Record Stock Movement</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}><X style={{ width: '20px', height: '20px' }} /></button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Select label="Movement Type" value={txType} onChange={e => setTxType(e.target.value as any)} options={[{ value: 'in', label: 'Stock IN (Production / Purchase)' }, { value: 'out', label: 'Stock OUT (Dispatch / Sale)' }, { value: 'opening', label: 'Opening Balance Setup' }]} />
              <Select label="Inventory SKU" value={form.item} onChange={e => setForm({ ...form, item: e.target.value })} options={STOCK_ITEMS.map(i => ({ value: i.name, label: i.name }))} />
              <Input label="Quantity" type="number" value={form.quantity || ''} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} />
              <Input label="Notes / Reference" placeholder="Batch number or reason..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button variant="primary" loading={saving} onClick={saveTransaction}>Record Movement</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
