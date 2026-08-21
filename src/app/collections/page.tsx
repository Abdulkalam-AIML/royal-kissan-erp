'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CreditCard, DollarSign, Smartphone, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SkeletonTable } from '@/components/ui/Skeleton'

export default function CollectionsPage() {
  const [collections, setCollections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadCollections() }, [])

  async function loadCollections() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('dealer_collections')
        .select('*')
        .order('collected_date', { ascending: false })
        .limit(100)

      setCollections(data || [])
    } catch {
      setCollections([])
    } finally {
      setLoading(false)
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'collected_date',
      title: 'Collection Date',
      sortable: true,
      render: (c) => <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>{c.collected_date}</span>,
    },
    {
      key: 'payment_mode',
      title: 'Payment Mode',
      render: (c) => (
        <Badge variant={c.payment_mode === 'upi' ? 'info' : 'success'}>
          {(c.payment_mode || 'cash').toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'notes',
      title: 'Description / Notes',
      render: (c) => <span style={{ color: '#f4f4f5' }}>{c.notes || 'Dealer collection deposit'}</span>,
    },
    {
      key: 'amount',
      title: 'Collected Amount (₹)',
      align: 'right',
      sortable: true,
      render: (c) => (
        <span className="num" style={{ fontWeight: 800, color: '#34d399' }}>
          {formatCurrency(Number(c.amount) || 0)}
        </span>
      ),
    },
  ]

  const totalCollected = collections.reduce((s, c) => s + (Number(c.amount) || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard style={{ color: '#fbbf24', width: '28px', height: '28px' }} />
            Route & Dealer Collections Register
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {collections.length} deposit records logged &bull; Total Collections: {' '}
            <span className="num" style={{ color: '#34d399', fontWeight: 800 }}>
              {formatCurrency(totalCollected)}
            </span>
          </p>
        </div>

        <Button variant="secondary" size="sm" icon={<RefreshCw style={{ width: '14px', height: '14px' }} />} onClick={loadCollections}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <SkeletonTable rows={6} />
      ) : (
        <DataTable
          columns={columns}
          data={collections}
          searchPlaceholder="Search collections by notes, mode, date..."
          exportFileName="royal-kissan-collections"
        />
      )}
    </div>
  )
}
