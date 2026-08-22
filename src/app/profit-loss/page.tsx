'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useDataSyncListener } from '@/lib/events/data-sync'
import { BarChart3, DollarSign, ArrowUpRight, ArrowDownLeft, TrendingUp, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SkeletonCard } from '@/components/ui/Skeleton'

export default function ProfitLossPage() {
  const [data, setData] = useState({ sales: 0, expenses: 0, salaries: 0, profit: 0 })
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'quarter' | 'year'>('month')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useDataSyncListener(['bills', 'expenses', 'all'], () => { loadData() })

  useEffect(() => {
    loadData()
  }, [period])

  async function loadData() {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      let fromDate = today

      if (period === 'week') {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        fromDate = d.toISOString().split('T')[0]
      } else if (period === 'month') {
        fromDate = today.slice(0, 7) + '-01'
      } else if (period === 'quarter') {
        const d = new Date()
        d.setMonth(d.getMonth() - 3)
        fromDate = d.toISOString().split('T')[0]
      } else if (period === 'year') {
        fromDate = `${new Date().getFullYear()}-01-01`
      }

      const [{ data: sales }, { data: expenses }, { data: salaries }] = await Promise.all([
        supabase.from('bills').select('total_amount').gte('date', fromDate),
        supabase.from('expenses').select('amount').gte('expense_date', fromDate),
        supabase.from('salary_payments').select('net_salary').gte('created_at', fromDate).eq('status', 'paid'),
      ])

      const totalSales = (sales || []).reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
      const totalExpenses = (expenses || []).reduce((s, r) => s + (Number(r.amount) || 0), 0)
      const totalSalaries = (salaries || []).reduce((s, r) => s + (Number(r.net_salary) || 0), 0)
      const netProfit = totalSales - totalExpenses - totalSalaries

      setData({
        sales: totalSales,
        expenses: totalExpenses,
        salaries: totalSalaries,
        profit: netProfit,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const margin = data.sales > 0 ? ((data.profit / data.sales) * 100).toFixed(1) : '0.0'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 style={{ color: '#fbbf24', width: '28px', height: '28px' }} />
            Profit & Loss Financial Statement
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Auto-calculated financial P&L summary of revenue, operating costs, and net margin.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['today', 'week', 'month', 'quarter', 'year'] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setPeriod(p)}
              style={{ textTransform: 'capitalize' }}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Main Net Profit Banner Card */}
          <Card style={{ padding: '1.5rem', border: `1px solid ${data.profit >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Net Operating {data.profit >= 0 ? 'Profit' : 'Loss'} ({period.toUpperCase()})
                </span>
                <div className="num" style={{ fontSize: '2.5rem', fontWeight: 900, color: data.profit >= 0 ? '#34d399' : '#f87171', marginTop: '0.25rem' }}>
                  {formatCurrency(data.profit)}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <Badge variant={data.profit >= 0 ? 'success' : 'danger'} style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
                  Net Margin: {margin}%
                </Badge>
                <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '0.35rem' }}>
                  {data.profit >= 0 ? '✅ Business is operating at a profit' : '⚠️ Costs exceed revenue for period'}
                </div>
              </div>
            </div>
          </Card>

          {/* Breakdown Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {/* Sales Revenue */}
            <Card style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase' }}>Gross Sales Revenue</span>
                <ArrowUpRight style={{ width: '18px', height: '18px', color: '#34d399' }} />
              </div>
              <div className="num" style={{ fontSize: '1.75rem', fontWeight: 900, color: '#34d399' }}>
                {formatCurrency(data.sales)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '0.25rem' }}>(+) Operating Inflows</div>
            </Card>

            {/* Operating Expenses */}
            <Card style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase' }}>Operating Expenses</span>
                <ArrowDownLeft style={{ width: '18px', height: '18px', color: '#f87171' }} />
              </div>
              <div className="num" style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f87171' }}>
                {formatCurrency(data.expenses)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '0.25rem' }}>(-) Plant & Diesel Costs</div>
            </Card>

            {/* Salaries Paid */}
            <Card style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase' }}>Salary & Payroll</span>
                <ArrowDownLeft style={{ width: '18px', height: '18px', color: '#fbbf24' }} />
              </div>
              <div className="num" style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fbbf24' }}>
                {formatCurrency(data.salaries)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '0.25rem' }}>(-) Staff Wages & Bata</div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
