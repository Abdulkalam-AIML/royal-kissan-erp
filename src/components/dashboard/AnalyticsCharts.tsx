'use client'

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const COLORS = ['hsl(217,91%,60%)', 'hsl(142,71%,45%)', 'hsl(38,92%,50%)', 'hsl(0,85%,60%)', 'hsl(270,75%,60%)', 'hsl(199,89%,48%)']

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'hsl(222 47% 10%)', border: '1px solid hsl(217 32% 20%)', borderRadius: '0.625rem', padding: '0.75rem 1rem', fontSize: '0.8125rem' }}>
        <p style={{ fontWeight: '700', marginBottom: '0.5rem', color: 'hsl(210 40% 98%)' }}>{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color, margin: '0.125rem 0' }}>
            {p.name}: {typeof p.value === 'number' && p.value > 999 ? `₹${p.value.toLocaleString('en-IN')}` : p.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function RevenueChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
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
  )
}

export function ProductSalesChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
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
  )
}

export function ProductMixChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name} ${value}%`} labelLine={false}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}
