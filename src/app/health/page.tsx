'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function HealthPage() {
  const [dbStatus, setDbStatus] = useState<'testing' | 'healthy' | 'unhealthy'>('testing')
  const [authStatus, setAuthStatus] = useState<'testing' | 'healthy' | 'unhealthy'>('testing')
  const [envStatus, setEnvStatus] = useState<Record<string, boolean>>({})
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [isMounted, setIsMounted] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    setIsMounted(true)
    checkHealth()
  }, [])

  async function checkHealth() {
    // Check Env
    const urlSet = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    const keySet = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    setEnvStatus({
      NEXT_PUBLIC_SUPABASE_URL: urlSet,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: keySet,
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    })

    if (!urlSet || !keySet) {
      setDbStatus('unhealthy')
      setAuthStatus('unhealthy')
      setErrorMsg('Missing key Supabase environment variables.')
      return
    }

    try {
      // Check Auth
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
      if (sessionErr) {
        setAuthStatus('unhealthy')
        setErrorMsg(prev => prev + `\nAuth session retrieval failed: ${sessionErr.message}`)
      } else {
        setAuthStatus('healthy')
      }

      // Check DB and count tables
      const tables = ['products', 'employees', 'drivers', 'routes', 'customers', 'dealers', 'settings']
      const fetchedCounts: Record<string, number> = {}
      let healthyCount = 0

      for (const table of tables) {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })

        if (error) {
          setErrorMsg(prev => prev + `\nTable "${table}" count query failed: [${error.code}] ${error.message}`)
        } else {
          fetchedCounts[table] = count || 0
          healthyCount++
        }
      }

      setCounts(fetchedCounts)

      if (healthyCount === tables.length) {
        setDbStatus('healthy')
      } else {
        setDbStatus('unhealthy')
      }

    } catch (err: any) {
      setDbStatus('unhealthy')
      setAuthStatus('unhealthy')
      setErrorMsg(prev => prev + `\nUnhandled Health Check exception: ${err.message || err}`)
    }
  }

  if (!isMounted) return null

  const isEverythingHealthy = dbStatus === 'healthy' && authStatus === 'healthy'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'hsl(222 47% 5%)',
      color: 'hsl(210 40% 98%)',
      padding: '2rem 1.5rem',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em' }}>
              🏥 System Health Monitor
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'hsl(215 20% 55%)', marginTop: '0.25rem' }}>
              Real-time diagnostic checks for Royal Kissan ERP
            </p>
          </div>
          <span style={{
            padding: '0.375rem 0.875rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '700',
            backgroundColor: isEverythingHealthy ? 'hsl(142 71% 45% / 0.2)' : 'hsl(0 85% 60% / 0.2)',
            color: isEverythingHealthy ? 'hsl(142 71% 55%)' : 'hsl(0 85% 70%)',
            border: `1px solid ${isEverythingHealthy ? 'hsl(142 71% 45% / 0.4)' : 'hsl(0 85% 60% / 0.4)'}`
          }}>
            {isEverythingHealthy ? 'SYSTEM HEALTHY' : 'DIAGNOSTICS PENDING/ERROR'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* DB Health Card */}
          <div style={{ background: 'hsl(222 47% 8%)', border: '1px solid hsl(217 32% 17%)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>Database Connectivity</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                backgroundColor: dbStatus === 'healthy' ? 'hsl(142 71% 55%)' : dbStatus === 'testing' ? 'hsl(38 92% 50%)' : 'hsl(0 85% 60%)'
              }} />
              <span style={{ fontWeight: '700', fontSize: '1.125rem' }}>
                {dbStatus === 'healthy' ? 'Active & Healthy' : dbStatus === 'testing' ? 'Testing connection...' : 'Offline / Setup Needed'}
              </span>
            </div>
          </div>

          {/* Auth Health Card */}
          <div style={{ background: 'hsl(222 47% 8%)', border: '1px solid hsl(217 32% 17%)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>Authentication APIs</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                backgroundColor: authStatus === 'healthy' ? 'hsl(142 71% 55%)' : authStatus === 'testing' ? 'hsl(38 92% 50%)' : 'hsl(0 85% 60%)'
              }} />
              <span style={{ fontWeight: '700', fontSize: '1.125rem' }}>
                {authStatus === 'healthy' ? 'Active & Ready' : authStatus === 'testing' ? 'Testing auth API...' : 'Configuration Error'}
              </span>
            </div>
          </div>
        </div>

        {/* Environment Vars */}
        <div style={{ background: 'hsl(222 47% 8%)', border: '1px solid hsl(217 32% 17%)', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '2rem' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid hsl(217 32% 17%)', fontWeight: '600' }}>Environment Check</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <tbody>
              {Object.entries(envStatus).map(([key, active]) => (
                <tr key={key} style={{ borderBottom: '1px solid hsl(217 32% 17% / 0.5)' }}>
                  <td style={{ padding: '0.75rem 1.25rem', color: 'hsl(215 20% 65%)' }}>{key}</td>
                  <td style={{ padding: '0.75rem 1.25rem', fontWeight: '700', color: active ? 'hsl(142 71% 55%)' : 'hsl(0 85% 70%)' }}>
                    {active ? '✅ ACTIVE' : '❌ MISSING'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Counts */}
        <div style={{ background: 'hsl(222 47% 8%)', border: '1px solid hsl(217 32% 17%)', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '2rem' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid hsl(217 32% 17%)', fontWeight: '600' }}>ERP Database Table Counts</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'hsl(217 32% 12%)' }}>
                <th style={{ padding: '0.75rem 1.25rem', textAlign: 'left', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', fontSize: '0.75rem' }}>Table Name</th>
                <th style={{ padding: '0.75rem 1.25rem', textAlign: 'right', color: 'hsl(215 20% 55%)', textTransform: 'uppercase', fontSize: '0.75rem' }}>Row Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(counts).map(([tbl, num]) => (
                <tr key={tbl} style={{ borderBottom: '1px solid hsl(217 32% 17% / 0.5)' }}>
                  <td style={{ padding: '0.75rem 1.25rem', fontWeight: '600' }}>{tbl}</td>
                  <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right', fontWeight: '700', color: 'hsl(217 91% 60%)' }}>{num}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Console logs */}
        {errorMsg && (
          <div style={{ background: 'hsl(222 47% 8%)', border: '1px solid hsl(0 85% 60% / 0.3)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', color: 'hsl(0 85% 70%)', fontWeight: '700', margin: '0 0 0.5rem' }}>Console logs & Error reports</h3>
            <pre style={{
              background: 'hsl(222 47% 5%)',
              border: '1px solid hsl(217 32% 17%)',
              borderRadius: '0.5rem',
              padding: '1rem',
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              color: 'hsl(0 85% 85%)',
              whiteSpace: 'pre-wrap',
              margin: 0
            }}>
              {errorMsg}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
