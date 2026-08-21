'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Download, Printer, Calendar, Filter, ArrowUpRight, ArrowDownLeft, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Input'
import { SkeletonTable } from '@/components/ui/Skeleton'

type ReportTab = 'daily' | 'sales' | 'collections' | 'dues'

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('daily')
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })
  const [reportData, setReportData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadReportData()
  }, [activeTab, dateRange])

  async function loadReportData() {
    setLoading(true)
    try {
      if (activeTab === 'sales' || activeTab === 'daily') {
        const { data } = await supabase
          .from('bills')
          .select('*')
          .gte('date', dateRange.startDate)
          .lte('date', dateRange.endDate)
          .order('date', { ascending: false })
        setReportData(data || [])
      } else if (activeTab === 'collections') {
        const { data } = await supabase
          .from('dealer_collections')
          .select('*')
          .order('collected_date', { ascending: false })
        setReportData(data || [])
      } else {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .gt('outstanding_amount', 0)
          .order('outstanding_amount', { ascending: false })
        setReportData(data || [])
      }
    } catch {
      setReportData([])
    } finally {
      setLoading(false)
    }
  }

  const salesColumns: Column<any>[] = [
    {
      key: 'invoice_number',
      title: 'Invoice No',
      render: (r) => <span style={{ fontWeight: 800, color: '#fbbf24', fontFamily: 'monospace' }}>{r.invoice_number}</span>,
    },
    {
      key: 'date',
      title: 'Date',
      render: (r) => <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>{r.date}</span>,
    },
    {
      key: 'customer_name',
      title: 'Customer Name',
      render: (r) => <span style={{ fontWeight: 600, color: '#f4f4f5' }}>{r.customer_name}</span>,
    },
    {
      key: 'total_amount',
      title: 'Total Amount (₹)',
      align: 'right',
      sortable: true,
      render: (r) => (
        <span className="num" style={{ fontWeight: 800, color: '#f4f4f5' }}>
          {formatCurrency(Number(r.total_amount) || 0)}
        </span>
      ),
    },
    {
      key: 'paid_amount',
      title: 'Paid (₹)',
      align: 'right',
      render: (r) => (
        <span className="num" style={{ color: '#34d399', fontWeight: 600 }}>
          {formatCurrency(Number(r.paid_amount) || 0)}
        </span>
      ),
    },
    {
      key: 'due_amount',
      title: 'Due (₹)',
      align: 'right',
      render: (r) => (
        <span className="num" style={{ color: Number(r.due_amount) > 0 ? '#f87171' : '#a1a1aa' }}>
          {formatCurrency(Number(r.due_amount) || 0)}
        </span>
      ),
    },
  ]

  const totalSales = reportData.reduce((sum, r) => sum + (Number(r.total_amount || r.amount || r.outstanding_amount) || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText style={{ color: '#fbbf24', width: '28px', height: '28px' }} />
            Enterprise Financial Reports & Audits
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Comprehensive sales, driver collection, dealer ledger, and due audit reports.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary" size="sm" icon={<Printer style={{ width: '14px', height: '14px' }} />} onClick={() => window.print()}>
            Print Report
          </Button>
        </div>
      </div>

      {/* Report Controls & Date Range */}
      <Card style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant={activeTab === 'daily' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab('daily')}>
              Daily Sales
            </Button>
            <Button variant={activeTab === 'sales' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab('sales')}>
              All Invoices
            </Button>
            <Button variant={activeTab === 'collections' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab('collections')}>
              Driver Collections
            </Button>
            <Button variant={activeTab === 'dues' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab('dues')}>
              Outstanding Dues
            </Button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Input type="date" value={dateRange.startDate} onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })} style={{ marginBottom: 0 }} />
            <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>to</span>
            <Input type="date" value={dateRange.endDate} onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })} style={{ marginBottom: 0 }} />
          </div>
        </div>
      </Card>

      {/* Summary KPI Card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <Card style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 600 }}>Total Period Revenue</div>
          <div className="num" style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fbbf24', marginTop: '0.25rem' }}>
            {formatCurrency(totalSales)}
          </div>
        </Card>
        <Card style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 600 }}>Total Records Generated</div>
          <div className="num" style={{ fontSize: '1.75rem', fontWeight: 900, color: '#60a5fa', marginTop: '0.25rem' }}>
            {reportData.length}
          </div>
        </Card>
      </div>

      {/* Report Table */}
      {loading ? (
        <SkeletonTable rows={8} />
      ) : (
        <DataTable
          columns={salesColumns}
          data={reportData}
          searchPlaceholder="Filter report records..."
          exportFileName={`royal-kissan-report-${activeTab}`}
        />
      )}
    </div>
  )
}
