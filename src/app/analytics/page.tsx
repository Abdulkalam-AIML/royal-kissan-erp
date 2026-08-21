'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { PieChart as PieChartIcon, TrendingUp, DollarSign, Activity, RefreshCw } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SkeletonCard } from '@/components/ui/Skeleton'

const RevenueChart = dynamic(() => import('@/components/dashboard/AnalyticsCharts').then(mod => mod.RevenueChart), {
  ssr: false,
  loading: () => <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw className="animate-spin text-amber-400" /></div>
})
const ProductSalesChart = dynamic(() => import('@/components/dashboard/AnalyticsCharts').then(mod => mod.ProductSalesChart), {
  ssr: false,
  loading: () => <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw className="animate-spin text-amber-400" /></div>
})
const ProductMixChart = dynamic(() => import('@/components/dashboard/AnalyticsCharts').then(mod => mod.ProductMixChart), {
  ssr: false,
  loading: () => <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw className="animate-spin text-amber-400" /></div>
})

const revenueData = [
  { month: 'Jan', revenue: 45000, expenses: 28000, profit: 17000 },
  { month: 'Feb', revenue: 52000, expenses: 31000, profit: 21000 },
  { month: 'Mar', revenue: 48000, expenses: 29000, profit: 19000 },
  { month: 'Apr', revenue: 61000, expenses: 35000, profit: 26000 },
  { month: 'May', revenue: 55000, expenses: 32000, profit: 23000 },
  { month: 'Jun', revenue: 67000, expenses: 38000, profit: 29000 },
]
const weeklyData = [
  { day: 'Mon', cans: 120, packets: 200, bottles: 150 },
  { day: 'Tue', cans: 145, packets: 180, bottles: 130 },
  { day: 'Wed', cans: 98, packets: 220, bottles: 190 },
  { day: 'Thu', cans: 160, packets: 195, bottles: 140 },
  { day: 'Fri', cans: 175, packets: 240, bottles: 160 },
  { day: 'Sat', cans: 200, packets: 280, bottles: 210 },
  { day: 'Sun', cans: 90, packets: 150, bottles: 110 },
]
const productMix = [
  { name: 'Water Cans', value: 45 },
  { name: 'Packets', value: 28 },
  { name: 'Bottles', value: 17 },
  { name: 'Cooling Cans', value: 10 },
]

export default function AnalyticsPage() {
  const [filter, setFilter] = useState('monthly')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieChartIcon style={{ color: '#fbbf24', width: '28px', height: '28px' }} />
            Analytics & Business Intelligence
          </h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Revenue trends, product mix breakdown, and operating profit analytics.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter(f)}
              style={{ textTransform: 'capitalize' }}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Summary Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <Card style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 600 }}>Total Revenue</div>
          <div className="num" style={{ fontSize: '1.75rem', fontWeight: 900, color: '#fbbf24', marginTop: '0.25rem' }}>₹3,24,000</div>
          <Badge variant="success" style={{ marginTop: '0.35rem' }}>+12% vs last month</Badge>
        </Card>
        <Card style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 600 }}>Net Profit</div>
          <div className="num" style={{ fontSize: '1.75rem', fontWeight: 900, color: '#34d399', marginTop: '0.25rem' }}>₹1,35,000</div>
          <Badge variant="success" style={{ marginTop: '0.35rem' }}>+8% vs last month</Badge>
        </Card>
        <Card style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 600 }}>Total Expenses</div>
          <div className="num" style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f87171', marginTop: '0.25rem' }}>₹1,89,000</div>
          <Badge variant="neutral" style={{ marginTop: '0.35rem' }}>Within Budget</Badge>
        </Card>
        <Card style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', fontWeight: 600 }}>Profit Margin</div>
          <div className="num" style={{ fontSize: '1.75rem', fontWeight: 900, color: '#60a5fa', marginTop: '0.25rem' }}>41.7%</div>
          <Badge variant="info" style={{ marginTop: '0.35rem' }}>High Operating Profit</Badge>
        </Card>
      </div>

      {/* Main Revenue & Profit Chart */}
      <Card style={{ padding: '1.5rem' }}>
        <CardHeader style={{ padding: 0, marginBottom: '1.25rem', borderBottom: 'none' }}>
          <CardTitle>Revenue, Expense & Operating Profit Growth</CardTitle>
        </CardHeader>
        <CardContent style={{ padding: 0 }}>
          <RevenueChart data={revenueData} />
        </CardContent>
      </Card>

      {/* Secondary Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <Card style={{ padding: '1.5rem' }}>
          <CardHeader style={{ padding: 0, marginBottom: '1.25rem', borderBottom: 'none' }}>
            <CardTitle>Daily Unit Volume Sales</CardTitle>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            <ProductSalesChart data={weeklyData} />
          </CardContent>
        </Card>

        <Card style={{ padding: '1.5rem' }}>
          <CardHeader style={{ padding: 0, marginBottom: '1.25rem', borderBottom: 'none' }}>
            <CardTitle>Product Sales Mix Share (%)</CardTitle>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            <ProductMixChart data={productMix} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
