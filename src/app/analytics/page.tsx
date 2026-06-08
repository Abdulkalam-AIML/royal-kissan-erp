'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const COLORS = ['hsl(217,91%,60%)', 'hsl(142,71%,45%)', 'hsl(38,92%,50%)', 'hsl(0,85%,60%)', 'hsl(270,75%,60%)', 'hsl(199,89%,48%)']

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
const expenseBreakdown = [
  { name: 'Salaries', value: 152000 },
  { name: 'Diesel/Fuel', value: 28000 },
  { name: 'Electricity', value: 18000 },
  { name: 'Maintenance', value: 12000 },
  { name: 'Marketing', value: 8000 },
  { name: 'Others', value: 5000 },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'hsl(222 47% 10%)', border: '1px solid hsl(217 32% 20%)', borderRadius: '0.625rem', padding: '0.75rem 1rem', fontSize: '0.8125rem' }}>
        <p style={{ fontWeight: '700', marginBottom: '0.5rem', color: 'hsl(210 40% 98%)' }}>{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color, margin: '0.125rem 0' }}>{p.name}: {typeof p.value === 'number' && p.value > 999 ? `₹${p.value.toLocaleString('en-IN')}` : p.value}</p>
        ))}
      </div>
    )
  }
  return null
}

export default function AnalyticsPage() {
  const [filter, setFilter] = useState('monthly')

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">📊 Analytics & Business Intelligence</h2>
          <p className="page-subtitle">Revenue trends, product performance, and profit analysis</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} style={{ textTransform: 'capitalize' }}>{f}</button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Revenue', value: '₹3,24,000', trend: '+12%', positive: true, icon: '💰', color: 'hsl(217,91%,60%)' },
          { label: 'Net Profit', value: '₹1,35,000', trend: '+8%', positive: true, icon: '📈', color: 'hsl(142,71%,45%)' },
          { label: 'Total Expenses', value: '₹2,23,000', trend: '+5%', positive: false, icon: '💸', color: 'hsl(0,85%,60%)' },
          { label: 'Profit Margin', value: '41.7%', trend: '+2.1%', positive: true, icon: '🎯', color: 'hsl(270,75%,60%)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: '600', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{s.label}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: '800', color: 'hsl(210 40% 98%)', lineHeight: 1 }} className="text-money">{s.value}</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', padding: '0.125rem 0.5rem', borderRadius: '9999px', background: s.positive ? 'hsl(142 71% 45% / 0.1)' : 'hsl(0 85% 60% / 0.1)', color: s.positive ? 'hsl(142 71% 55%)' : 'hsl(0 85% 70%)', fontSize: '0.7rem', fontWeight: '600' }}>
                  {s.positive ? '↑' : '↓'} {s.trend}
                </div>
              </div>
              <span style={{ fontSize: '1.75rem' }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3 className="card-title">📈 Revenue, Expense & Profit Trend</h3>
          <span className="badge badge-info">6 Months</span>
        </div>
        <div className="card-body" style={{ padding: '1rem 0.5rem' }}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <defs>
                {['Revenue', 'Expenses', 'Profit'].map((name, i) => (
                  <linearGradient key={name} id={`color${name}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[i]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS[i]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 32% 20%)" />
              <XAxis dataKey="month" stroke="hsl(215 20% 45%)" fontSize={11} />
              <YAxis stroke="hsl(215 20% 45%)" fontSize={11} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', color: 'hsl(215 20% 55%)' }} />
              <Area type="monotone" dataKey="revenue" stroke={COLORS[0]} fill="url(#colorRevenue)" strokeWidth={2} name="Revenue" />
              <Area type="monotone" dataKey="expenses" stroke={COLORS[2]} fill="url(#colorExpenses)" strokeWidth={2} name="Expenses" />
              <Area type="monotone" dataKey="profit" stroke={COLORS[1]} fill="url(#colorProfit)" strokeWidth={2} name="Profit" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="content-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Sales by Product */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📦 Sales by Product (Weekly)</h3>
          </div>
          <div className="card-body" style={{ padding: '1rem 0.5rem' }}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 32% 20%)" />
                <XAxis dataKey="day" stroke="hsl(215 20% 45%)" fontSize={11} />
                <YAxis stroke="hsl(215 20% 45%)" fontSize={11} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', color: 'hsl(215 20% 55%)' }} />
                <Bar dataKey="cans" fill={COLORS[0]} name="Water Cans" radius={[4, 4, 0, 0]} />
                <Bar dataKey="packets" fill={COLORS[5]} name="Packets" radius={[4, 4, 0, 0]} />
                <Bar dataKey="bottles" fill={COLORS[4]} name="Bottles" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Mix Pie */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🥧 Revenue Mix by Product</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={productMix} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name} ${value}%`} labelLine={false}>
                  {productMix.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
              {productMix.map((item, i) => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: COLORS[i], flexShrink: 0 }} />
                  <span style={{ color: 'hsl(215 20% 65%)' }}>{item.name}</span>
                  <span style={{ fontWeight: '700', color: 'hsl(210 40% 98%)', marginLeft: 'auto' }}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Expense Breakdown */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">💸 Expense Breakdown</h3>
          <span style={{ fontSize: '0.875rem', fontWeight: '700', color: 'hsl(0 85% 70%)' }} className="text-money">
            Total: ₹{expenseBreakdown.reduce((s, e) => s + e.value, 0).toLocaleString('en-IN')}
          </span>
        </div>
        <div className="card-body">
          {expenseBreakdown.map((item, i) => {
            const total = expenseBreakdown.reduce((s, e) => s + e.value, 0)
            const pct = (item.value / total) * 100
            return (
              <div key={item.name} style={{ marginBottom: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: COLORS[i] }} />
                    <span style={{ fontSize: '0.875rem', color: 'hsl(215 20% 65%)' }}>{item.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                    <span style={{ color: 'hsl(215 20% 45%)' }}>{pct.toFixed(1)}%</span>
                    <span style={{ fontWeight: '700', color: 'hsl(210 40% 98%)' }} className="text-money">₹{item.value.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div style={{ height: '8px', background: 'hsl(217 32% 15%)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: COLORS[i], borderRadius: '4px', transition: 'width 1s ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
