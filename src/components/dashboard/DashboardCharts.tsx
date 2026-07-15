'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts'

interface DashboardChartsProps {
  salesTrendData: any[]
  driverChartData: any[]
}

export default function DashboardCharts({ salesTrendData, driverChartData }: DashboardChartsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
      <div className="glass-card-3d" style={{ padding: '1.5rem 1.25rem 0.5rem' }}>
        <div style={{ marginBottom: '1.25rem', padding: '0 0.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', margin: 0 }}>📊 Weekly Sales Trend</h3>
          <p style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)', margin: '0.125rem 0 0' }}>Sales vs collections this week</p>
        </div>
        <div style={{ width: '100%', height: '260px' }}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={salesTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorColl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="name" stroke="hsl(215 20% 55%)" fontSize={11} tickLine={false} />
              <YAxis stroke="hsl(215 20% 55%)" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', fontSize: '12px', color: '#fff' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Area type="monotone" dataKey="Sales" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
              <Area type="monotone" dataKey="Collection" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorColl)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card-3d" style={{ padding: '1.5rem 1.25rem 0.5rem' }}>
        <div style={{ marginBottom: '1.25rem', padding: '0 0.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', margin: 0 }}>🚛 Driver Performance</h3>
          <p style={{ fontSize: '0.75rem', color: 'hsl(215 20% 55%)', margin: '0.125rem 0 0' }}>Nagaraju vs Driver-2 breakdown</p>
        </div>
        <div style={{ width: '100%', height: '260px' }}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={driverChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="name" stroke="hsl(215 20% 55%)" fontSize={11} tickLine={false} />
              <YAxis stroke="hsl(215 20% 55%)" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', fontSize: '12px', color: '#fff' }} />
              <Legend iconType="rect" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="Sales" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="Collected" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="Dues" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
