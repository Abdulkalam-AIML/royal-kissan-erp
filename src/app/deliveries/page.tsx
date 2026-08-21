'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Plus, Truck, Calendar, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SkeletonTable } from '@/components/ui/Skeleton'

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => { loadDeliveries() }, [])

  async function loadDeliveries() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('bills')
        .select('*')
        .eq('bill_type', 'driver_sale')
        .order('created_at', { ascending: false })
        .limit(100)

      setDeliveries(data || [])
    } catch {
      setDeliveries([])
    } finally {
      setLoading(false)
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'invoice_number',
      title: 'Delivery Invoice',
      sortable: true,
      render: (d) => <span style={{ fontWeight: 800, color: '#fbbf24', fontFamily: 'monospace' }}>{d.invoice_number}</span>,
    },
    {
      key: 'date',
      title: 'Dispatch Date',
      render: (d) => <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>{d.date}</span>,
    },
    {
      key: 'customer_name',
      title: 'Destination / Customer',
      render: (d) => <span style={{ fontWeight: 600, color: '#f4f4f5' }}>{d.customer_name}</span>,
    },
    {
      key: 'total_amount',
      title: 'Total Value (₹)',
      align: 'right',
      sortable: true,
      render: (d) => (
        <span className="num" style={{ fontWeight: 800, color: '#f4f4f5' }}>
          {formatCurrency(Number(d.total_amount) || 0)}
        </span>
      ),
    },
    {
      key: 'payment_status',
      title: 'Status',
      render: (d) => (
        <Badge variant={d.payment_status === 'paid' ? 'success' : 'warning'}>
          {(d.payment_status || 'Delivered').toUpperCase()}
        </Badge>
      ),
    },
  ]

  const totalDeliveryVal = deliveries.reduce((s, d) => s + (Number(d.total_amount) || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Truck style={{ color: '#fbbf24', width: '28px', height: '28px' }} />
            Delivery Dispatch Tracking
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {deliveries.length} route dispatches logged &bull; Total Delivery Value: {' '}
            <span className="num" style={{ color: '#fbbf24', fontWeight: 800 }}>
              {formatCurrency(totalDeliveryVal)}
            </span>
          </p>
        </div>

        <a href="/billing?type=driver_sale">
          <Button variant="primary" icon={<Plus style={{ width: '16px', height: '16px' }} />}>
            New Route Dispatch Bill
          </Button>
        </a>
      </div>

      {loading ? (
        <SkeletonTable rows={6} />
      ) : (
        <DataTable
          columns={columns}
          data={deliveries}
          searchPlaceholder="Search delivery dispatches by customer, invoice..."
          exportFileName="royal-kissan-deliveries"
        />
      )}
    </div>
  )
}
