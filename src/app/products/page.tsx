'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { emitDataChange, useDataSyncListener } from '@/lib/events/data-sync'
import { Package, Plus, Edit, Check, X, Shield, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import { SkeletonTable } from '@/components/ui/Skeleton'

const DEFAULT_PRODUCTS = [
  { id: '1', name: 'Water Can (20L)',   category: 'Can',    unit: 'piece', default_rate: 15,  gst_rate: 18, hsn_code: '2201', is_active: true },
  { id: '2', name: 'Cooling Can (20L)', category: 'Can',    unit: 'piece', default_rate: 30,  gst_rate: 18, hsn_code: '2201', is_active: true },
  { id: '3', name: 'Water Packets',     category: 'Packet', unit: 'piece', default_rate: 80,  gst_rate: 12, hsn_code: '2201', is_active: true },
  { id: '4', name: '500ml Bottle Case', category: 'Bottle', unit: 'case',  default_rate: 140, gst_rate: 18, hsn_code: '2201', is_active: true },
  { id: '5', name: '1L Bottle Case',    category: 'Bottle', unit: 'case',  default_rate: 120, gst_rate: 18, hsn_code: '2201', is_active: true },
  { id: '6', name: '2L Bottle Case',    category: 'Bottle', unit: 'case',  default_rate: 150, gst_rate: 18, hsn_code: '2201', is_active: true },
]

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>(DEFAULT_PRODUCTS)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', category: 'Can', unit: 'piece', default_rate: 0, gst_rate: 18, hsn_code: '2201', is_active: true })
  const supabase = createClient()

  useDataSyncListener(['products', 'all'], () => { loadProducts() })

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    setLoading(true)
    try {
      const { data } = await supabase.from('products').select('id, name, category, default_rate, gst_rate, hsn_code, is_active, unit').order('name')
      if (data && data.length > 0) setProducts(data)
    } catch {
      // fallback
    } finally {
      setLoading(false)
    }
  }

  function startEdit(p: any) {
    setEditingId(p.id)
    setEditForm({ ...p })
  }

  async function saveEdit() {
    setSaving(true)
    try {
      if (editForm.id) {
        const { data, error } = await supabase.from('products').update({
          name: editForm.name,
          default_rate: Number(editForm.default_rate) || 0,
          gst_rate: Number(editForm.gst_rate) || 0,
          hsn_code: editForm.hsn_code,
          is_active: editForm.is_active,
          category: editForm.category,
          updated_at: new Date().toISOString()
        }).eq('id', editForm.id).select().single()

        if (error) throw error

        if (data) {
          setProducts(prev => prev.map(p => p.id === editingId ? data : p))
        }
        emitDataChange('products')
        setEditingId(null)
        alert('✅ Product updated successfully!')
      }
    } catch (e: any) {
      alert(`Error updating product: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function saveNewProduct() {
    if (!addForm.name.trim()) {
      alert('Product name is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...addForm,
        default_rate: Number(addForm.default_rate) || 0,
        gst_rate: Number(addForm.gst_rate) || 0,
      }
      const { data, error } = await supabase.from('products').insert([payload]).select().single()
      if (error) throw error
      if (data) {
        setProducts(prev => [...prev, data])
      }
      emitDataChange('products')
      setShowAdd(false)
      setAddForm({ name: '', category: 'Can', unit: 'piece', default_rate: 0, gst_rate: 18, hsn_code: '2201', is_active: true })
      alert('✅ New product saved successfully in database!')
    } catch (e: any) {
      alert(`Error saving product: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'name',
      title: 'Product Name',
      sortable: true,
      render: (p) => (
        editingId === p.id ? (
          <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={{ marginBottom: 0 }} />
        ) : (
          <div style={{ fontWeight: 700, color: '#f4f4f5' }}>{p.name}</div>
        )
      ),
    },
    {
      key: 'category',
      title: 'Category',
      render: (p) => (
        <Badge variant="neutral">{p.category || 'Can'}</Badge>
      ),
    },
    {
      key: 'default_rate',
      title: 'Default Rate (₹)',
      align: 'right',
      sortable: true,
      render: (p) => (
        editingId === p.id ? (
          <Input type="number" value={editForm.default_rate} onChange={e => setEditForm({ ...editForm, default_rate: Number(e.target.value) })} style={{ marginBottom: 0, width: '100px', textAlign: 'right' }} />
        ) : (
          <span className="num" style={{ fontWeight: 700, color: '#fbbf24' }}>
            {formatCurrency(Number(p.default_rate) || 0)}
          </span>
        )
      ),
    },
    {
      key: 'gst_rate',
      title: 'GST Rate (%)',
      align: 'right',
      render: (p) => (
        editingId === p.id ? (
          <Input type="number" value={editForm.gst_rate} onChange={e => setEditForm({ ...editForm, gst_rate: Number(e.target.value) })} style={{ marginBottom: 0, width: '80px', textAlign: 'right' }} />
        ) : (
          <span className="num" style={{ color: '#a1a1aa' }}>{p.gst_rate || 18}%</span>
        )
      ),
    },
    {
      key: 'hsn_code',
      title: 'HSN Code',
      render: (p) => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#71717a' }}>{p.hsn_code || '2201'}</span>
      ),
    },
    {
      key: 'is_active',
      title: 'Status',
      render: (p) => (
        <Badge variant={p.is_active !== false ? 'success' : 'danger'}>
          {p.is_active !== false ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      align: 'right',
      render: (p) => (
        editingId === p.id ? (
          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
            <Button variant="primary" size="sm" icon={<Check style={{ width: '12px', height: '12px' }} />} loading={saving} onClick={saveEdit} />
            <Button variant="secondary" size="sm" icon={<X style={{ width: '12px', height: '12px' }} />} onClick={() => setEditingId(null)} />
          </div>
        ) : (
          <Button variant="secondary" size="sm" icon={<Edit style={{ width: '12px', height: '12px' }} />} onClick={() => startEdit(p)}>
            Edit Rate
          </Button>
        )
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package style={{ color: '#fbbf24', width: '28px', height: '28px' }} />
            Product Master & Pricing Catalog
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {products.length} products listed &bull; Manage default rates, GST tax slabs, and active SKU statuses.
          </p>
        </div>

        <Button variant="primary" icon={<Plus style={{ width: '16px', height: '16px' }} />} onClick={() => setShowAdd(true)}>
          Add New Product
        </Button>
      </div>

      {loading ? (
        <SkeletonTable rows={6} />
      ) : (
        <DataTable
          columns={columns}
          data={products}
          searchPlaceholder="Search product by name, category, HSN..."
          exportFileName="royal-kissan-products"
        />
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff' }}>Add New Product SKU</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
                <X style={{ width: '20px', height: '20px' }} />
              </button>
            </div>
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input label="Product Name" placeholder="e.g. 20L Water Can" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Select label="Category" value={addForm.category} onChange={e => setAddForm({ ...addForm, category: e.target.value })} options={[{ value: 'Can', label: 'Water Can' }, { value: 'Bottle', label: 'Bottle Case' }, { value: 'Packet', label: 'Water Packets' }]} />
                <Input label="Default Rate (₹)" type="number" value={addForm.default_rate} onChange={e => setAddForm({ ...addForm, default_rate: Number(e.target.value) })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Input label="GST Rate (%)" type="number" value={addForm.gst_rate} onChange={e => setAddForm({ ...addForm, gst_rate: Number(e.target.value) })} />
                <Input label="HSN Code" value={addForm.hsn_code} onChange={e => setAddForm({ ...addForm, hsn_code: e.target.value })} />
              </div>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button variant="primary" loading={saving} onClick={saveNewProduct}>Create Product</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
