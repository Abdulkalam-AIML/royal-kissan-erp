'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

const TABLES_TO_CHECK = [
  'bills',
  'dealers',
  'drivers',
  'employees',
  'products',
  'sales',
  'routes',
  'non_local_routes',
  'expenses',
  'salary',
  'stock'
]

export default function DiagnosticsPage() {
  const [isMounted, setIsMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Environment variables states
  const [supabaseUrl, setSupabaseUrl] = useState('')
  const [envStatus, setEnvStatus] = useState<'testing' | 'healthy' | 'unhealthy'>('testing')
  const [anonKeyLoaded, setAnonKeyLoaded] = useState(false)
  const [pubKeyLoaded, setPubKeyLoaded] = useState(false)
  
  // Connection / Query verification states
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'healthy' | 'unhealthy'>('testing')
  const [dbReadStatus, setDbReadStatus] = useState<'testing' | 'healthy' | 'unhealthy'>('testing')
  const [dbWriteStatus, setDbWriteStatus] = useState<'testing' | 'healthy' | 'unhealthy'>('testing')
  const [tablesStatus, setTablesStatus] = useState<'testing' | 'healthy' | 'warning' | 'unhealthy'>('testing')
  const [authStatus, setAuthStatus] = useState<'testing' | 'healthy' | 'warning' | 'unhealthy'>('testing')
  const [activeUserEmail, setActiveUserEmail] = useState<string>('')
  
  // Specific query states for "bills" select
  const [billsDataReturned, setBillsDataReturned] = useState<string>('Not tested yet')
  const [billsError, setBillsError] = useState<string>('None')
  
  // Table checks
  const [tableStatuses, setTableStatuses] = useState<Record<string, { exists: boolean; count?: number; error?: string }>>({})
  
  // Insert test
  const [insertStatus, setInsertStatus] = useState<string>('Not tested')
  const [insertError, setInsertError] = useState<string>('None')
  
  const [diagnosticsLogs, setDiagnosticsLogs] = useState<string[]>([])

  const supabase = createClient()

  useEffect(() => {
    setIsMounted(true)
    runDiagnostics()
  }, [])

  const log = (msg: string) => {
    setDiagnosticsLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }

  async function runDiagnostics() {
    setLoading(true)
    setDiagnosticsLogs([])
    log('Starting diagnostics check...')

    // 1. Env check
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const pubKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
    
    console.log("SUPABASE URL:", url)
    console.log("SUPABASE KEY:", pubKey)

    setSupabaseUrl(url)
    setAnonKeyLoaded(!!anonKey)
    setPubKeyLoaded(!!pubKey)
    
    log(`SUPABASE URL Loaded: ${url ? 'Yes' : 'No'}`)
    log(`Anon Key Loaded: ${anonKey ? 'Yes' : 'No'}`)
    log(`Publishable Key Loaded: ${pubKey ? 'Yes' : 'No'}`)

    if (!url || !anonKey) {
      setEnvStatus('unhealthy')
      setConnectionStatus('unhealthy')
      setDbReadStatus('unhealthy')
      setDbWriteStatus('unhealthy')
      setTablesStatus('unhealthy')
      setAuthStatus('unhealthy')
      setLoading(false)
      log('❌ Aborting: Missing Supabase URL or Anon Key.')
      return
    }

    setEnvStatus('healthy')
    log('🟢 Environment Variables verified.')

    try {
      // 2. Ping check (Informational only)
      log('Pinging Supabase REST API (Informational)...')
      try {
        const pingRes = await fetch(`${url}/rest/v1/`, {
          headers: { 'apikey': anonKey }
        })
        log(`Ping Response Status: ${pingRes.status} (${pingRes.status === 401 ? 'Protected Endpoint — Normal Behavior' : pingRes.statusText})`)
      } catch (err: any) {
        log(`⚠️ Ping fetch exception: ${err.message || err} (Normal if network restricts direct REST pings)`)
      }

      // 3. Select 1 record from bills (Database Read check)
      log('Querying "bills" table to test SELECT connectivity...')
      const { data: selectData, error: selectErr } = await supabase
        .from('bills')
        .select('*')
        .limit(1)

      let readOk = false
      if (selectErr) {
        setBillsDataReturned('None')
        setBillsError(`[Code: ${selectErr.code}] ${selectErr.message} (Detail: ${selectErr.details || 'none'}, Hint: ${selectErr.hint || 'none'})`)
        log(`❌ Query on "bills" failed: ${selectErr.message}`)
        setDbReadStatus('unhealthy')
      } else {
        readOk = true
        setBillsDataReturned(JSON.stringify(selectData, null, 2))
        setBillsError('None')
        log(`✅ Query on "bills" succeeded! Data size: ${selectData?.length || 0}`)
        setDbReadStatus('healthy')
      }

      // 4. Check all Tables (Table Access Checklist)
      const statuses: typeof tableStatuses = {}
      let healthyTablesCount = 0
      for (const tableName of TABLES_TO_CHECK) {
        log(`Checking table: ${tableName}...`)
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })

        if (error) {
          statuses[tableName] = { exists: false, error: `[Code: ${error.code}] ${error.message}` }
          log(`❌ Table "${tableName}" check failed: ${error.message}`)
        } else {
          statuses[tableName] = { exists: true, count: count || 0 }
          log(`✅ Table "${tableName}" verified. Row count: ${count || 0}`)
          healthyTablesCount++
        }
      }
      setTableStatuses(statuses)
      
      if (healthyTablesCount === TABLES_TO_CHECK.length) {
        setTablesStatus('healthy')
      } else if (healthyTablesCount > 0) {
        setTablesStatus('warning')
      } else {
        setTablesStatus('unhealthy')
      }

      // 5. Test Insert on "bills" (Database Write check)
      log('Running test insert on "bills"...')
      const testInvoiceNo = `TEST-DIAG-${Date.now().toString().slice(-4)}`
      const testPayload = {
        invoice_number: testInvoiceNo,
        bill_type: 'company_sale',
        customer_name: 'Test Diagnostics Customer',
        subtotal: 100.00,
        gst_amount: 18.00,
        total_amount: 118.00,
        payment_method: 'cash',
        due_amount: 0.00,
        date: new Date().toISOString().split('T')[0]
      }
      
      const { data: insertData, error: insErr } = await supabase
        .from('bills')
        .insert(testPayload)
        .select()
        .single()

      let writeOk = false
      if (insErr) {
        setInsertStatus('Failed')
        setInsertError(`[Code: ${insErr.code}] ${insErr.message} (Detail: ${insErr.details || 'none'}, Hint: ${insErr.hint || 'none'})`)
        log(`❌ Test Insert Failed: [${insErr.code}] ${insErr.message}`)
        setDbWriteStatus('unhealthy')
      } else {
        writeOk = true
        setInsertStatus('Succeeded')
        setInsertError('None')
        log(`✅ Test Insert Succeeded! New Bill ID: ${insertData.id}`)
        setDbWriteStatus('healthy')
        
        // Clean up immediately
        log('Cleaning up test row...')
        const { error: delErr } = await supabase.from('bills').delete().eq('id', insertData.id)
        if (delErr) {
          log(`⚠️ Cleanup failed: ${delErr.message}`)
        } else {
          log('✅ Cleanup completed.')
        }
      }

      // 6. Authentication Check
      log('Checking authentication session...')
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr) {
        setAuthStatus('unhealthy')
        log(`❌ Auth session check failed: ${userErr.message}`)
      } else if (user) {
        setAuthStatus('healthy')
        setActiveUserEmail(user.email || 'Verified user')
        log(`✅ Authenticated Session Found for user: ${user.email}`)
      } else {
        setAuthStatus('warning')
        log('🟡 Anonymous mode (No active logged in user)')
      }

      // 7. Overall Connection Status (Query-based logic: Offline only if BOTH read and write fail)
      if (readOk || writeOk) {
        setConnectionStatus('healthy')
        log('✅ Overall Database Connection: ONLINE & HEALTHY')
      } else {
        setConnectionStatus('unhealthy')
        log('❌ Overall Database Connection: OFFLINE (Both Read & Write failed)')
      }

    } catch (e: any) {
      log(`❌ Diagnostic exception: ${e.message || e}`)
      setConnectionStatus('unhealthy')
      setDbReadStatus('unhealthy')
      setDbWriteStatus('unhealthy')
    } finally {
      setLoading(false)
      log('Diagnostics completed.')
    }
  }

  if (!isMounted) return null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, hsl(222 47% 6%) 0%, hsl(222 47% 4%) 100%)',
      color: '#f8fafc',
      padding: '2.5rem 1.5rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Header section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '800', margin: 0, color: '#38bdf8', letterSpacing: '-0.025em' }}>
              🔌 Supabase Connection Audit & Diagnostics
            </h1>
            <p style={{ color: 'hsl(215 20% 65%)', fontSize: '0.925rem', marginTop: '0.35rem' }}>
              Query-based connectivity diagnostics for Royal Kissan ERP
            </p>
          </div>
          <button 
            onClick={runDiagnostics} 
            disabled={loading}
            style={{
              padding: '0.625rem 1.5rem',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              border: 'none',
              borderRadius: '0.5rem',
              color: '#fff',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.4)',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? '⏳ Diagnosing...' : '🔄 Rerun Diagnostics'}
          </button>
        </div>

        {/* Global Connection Badge Alert Banner */}
        <div style={{
          background: connectionStatus === 'healthy' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          border: `1px solid ${connectionStatus === 'healthy' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          borderRadius: '0.75rem',
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{
              width: '12px', height: '12px', borderRadius: '50%',
              background: connectionStatus === 'healthy' ? '#10b981' : connectionStatus === 'testing' ? '#f59e0b' : '#ef4444',
              boxShadow: connectionStatus === 'healthy' ? '0 0 12px #10b981' : '0 0 12px #ef4444'
            }} />
            <div>
              <div style={{ fontSize: '0.8125rem', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)' }}>Overall Status</div>
              <strong style={{ fontSize: '1.375rem', color: connectionStatus === 'healthy' ? '#10b981' : '#f87171' }}>
                {connectionStatus === 'healthy' ? '🟢 HEALTHY' : connectionStatus === 'testing' ? 'Testing Connection...' : '🔴 UNHEALTHY'}
              </strong>
            </div>
          </div>
          <div style={{ fontSize: '0.875rem', color: 'hsl(215 20% 55%)', textAlign: 'right' }}>
            Connection verified via actual SELECT & INSERT query operations
          </div>
        </div>

        {/* 5-Subcomponent diagnostic matrix cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}>
          {/* Env Card */}
          <div style={{ background: 'hsl(222 47% 7%)', border: '1px solid hsl(217 32% 14%)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', marginBottom: '0.5rem' }}>Environment Check</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: envStatus === 'healthy' ? '#10b981' : '#ef4444', fontSize: '1.25rem', fontWeight: '700' }}>
                {envStatus === 'healthy' ? '🟢 Working' : '🔴 Failed'}
              </span>
            </div>
          </div>

          {/* Read Card */}
          <div style={{ background: 'hsl(222 47% 7%)', border: '1px solid hsl(217 32% 14%)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', marginBottom: '0.5rem' }}>Database Read</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: dbReadStatus === 'healthy' ? '#10b981' : dbReadStatus === 'testing' ? '#f59e0b' : '#ef4444', fontSize: '1.25rem', fontWeight: '700' }}>
                {dbReadStatus === 'healthy' ? '🟢 Working' : dbReadStatus === 'testing' ? '🟡 Testing...' : '🔴 Failed'}
              </span>
            </div>
          </div>

          {/* Write Card */}
          <div style={{ background: 'hsl(222 47% 7%)', border: '1px solid hsl(217 32% 14%)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', marginBottom: '0.5rem' }}>Database Write</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: dbWriteStatus === 'healthy' ? '#10b981' : dbWriteStatus === 'testing' ? '#f59e0b' : '#ef4444', fontSize: '1.25rem', fontWeight: '700' }}>
                {dbWriteStatus === 'healthy' ? '🟢 Working' : dbWriteStatus === 'testing' ? '🟡 Testing...' : '🔴 Failed'}
              </span>
            </div>
          </div>

          {/* Tables Checklist Status */}
          <div style={{ background: 'hsl(222 47% 7%)', border: '1px solid hsl(217 32% 14%)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', marginBottom: '0.5rem' }}>Tables Status</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: tablesStatus === 'healthy' ? '#10b981' : tablesStatus === 'warning' ? '#f59e0b' : '#ef4444', fontSize: '1.25rem', fontWeight: '700' }}>
                {tablesStatus === 'healthy' ? '🟢 Working' : tablesStatus === 'warning' ? '🟡 Warnings' : '🔴 Failed'}
              </span>
            </div>
          </div>

          {/* Auth Card */}
          <div style={{ background: 'hsl(222 47% 7%)', border: '1px solid hsl(217 32% 14%)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 20% 55%)', marginBottom: '0.5rem' }}>Authentication</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: authStatus === 'healthy' ? '#10b981' : authStatus === 'warning' ? '#f59e0b' : '#ef4444', fontSize: '1.25rem', fontWeight: '700' }}>
                {authStatus === 'healthy' ? '🟢 Active User' : authStatus === 'warning' ? '🟡 No Active User' : '🔴 Failed'}
              </span>
            </div>
            {activeUserEmail && <div style={{ fontSize: '0.7rem', color: 'hsl(215 20% 65%)', marginTop: '0.25rem', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeUserEmail}</div>}
          </div>
        </div>

        {/* Detailed diagnostic panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Loaded env detail */}
          <div style={{ background: 'hsl(222 47% 7%)', border: '1px solid hsl(217 32% 14%)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', color: '#38bdf8', textTransform: 'uppercase', margin: '0 0 0.75rem', fontWeight: '700' }}>1. Loaded Environment Variables</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              <div><strong>NEXT_PUBLIC_SUPABASE_URL:</strong> {supabaseUrl || '⚠️ UNDEFINED'}</div>
              <div><strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong> {anonKeyLoaded ? '✅ LOADED (Valid token)' : '⚠️ UNDEFINED'}</div>
              <div><strong>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:</strong> {pubKeyLoaded ? '✅ LOADED (Valid token)' : '⚠️ UNDEFINED'}</div>
            </div>
          </div>

          {/* SELECT query details */}
          <div style={{ background: 'hsl(222 47% 7%)', border: '1px solid hsl(217 32% 14%)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', color: '#38bdf8', textTransform: 'uppercase', margin: '0 0 0.75rem', fontWeight: '700' }}>2. "bills" SELECT Query Diagnostic</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div>
                <strong>Data Returned (Limit 1):</strong>
                <pre style={{
                  background: 'hsl(222 47% 4%)',
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid hsl(217 32% 12%)',
                  overflowX: 'auto',
                  fontSize: '0.8125rem',
                  fontFamily: 'monospace',
                  marginTop: '0.25rem',
                  color: '#34d399'
                }}>{billsDataReturned}</pre>
              </div>
              <div>
                <strong>Supabase Query Error:</strong>
                <div style={{
                  color: billsError === 'None' ? '#10b981' : '#f87171',
                  fontWeight: '600',
                  fontFamily: 'monospace',
                  marginTop: '0.25rem'
                }}>{billsError}</div>
              </div>
            </div>
          </div>

          {/* INSERT query details */}
          <div style={{ background: 'hsl(222 47% 7%)', border: '1px solid hsl(217 32% 14%)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', color: '#38bdf8', textTransform: 'uppercase', margin: '0 0 0.75rem', fontWeight: '700' }}>3. "bills" INSERT/DELETE (Write) Diagnostic</h3>
            <div style={{ fontSize: '0.875rem' }}>
              <div><strong>Insert Status:</strong> <span style={{ fontWeight: '700', color: insertStatus === 'Succeeded' ? '#10b981' : insertStatus === 'Failed' ? '#ef4444' : '#f59e0b' }}>{insertStatus}</span></div>
              <div style={{ marginTop: '0.5rem' }}><strong>Insert Error:</strong></div>
              <div style={{
                color: insertError === 'None' ? '#10b981' : '#f87171',
                fontWeight: '600',
                fontFamily: 'monospace',
                marginTop: '0.25rem'
              }}>{insertError}</div>
            </div>
          </div>

          {/* Tables checklist */}
          <div style={{ background: 'hsl(222 47% 7%)', border: '1px solid hsl(217 32% 14%)', borderRadius: '0.75rem', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid hsl(217 32% 14%)', fontWeight: '700', color: '#38bdf8' }}>4. Required Tables Checklist</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'hsl(222 47% 10%)', borderBottom: '1px solid hsl(217 32% 14%)' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'hsl(215 20% 55%)' }}>Table Name</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'hsl(215 20% 55%)' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'hsl(215 20% 55%)' }}>Details / Error</th>
                </tr>
              </thead>
              <tbody>
                {TABLES_TO_CHECK.map(tableName => {
                  const s = tableStatuses[tableName]
                  return (
                    <tr key={tableName} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>{tableName}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        {s ? (
                          s.exists ? <span style={{ color: '#10b981', fontWeight: '700' }}>✅ EXISTS</span> : <span style={{ color: '#ef4444', fontWeight: '700' }}>❌ MISSING</span>
                        ) : '...'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: s?.exists ? '#38bdf8' : '#f87171', fontFamily: s?.exists ? 'monospace' : 'inherit' }}>
                        {s ? (s.exists ? `Rows: ${s.count}` : s.error) : '...'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Diagnostics console log */}
          <div style={{ background: 'hsl(222 47% 7%)', border: '1px solid hsl(217 32% 14%)', borderRadius: '0.75rem', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.75rem', color: '#38bdf8' }}>5. Live Diagnostics Log</h3>
            <pre style={{
              background: 'hsl(222 47% 4%)',
              border: '1px solid hsl(217 32% 14%)',
              borderRadius: '0.5rem',
              padding: '1rem',
              fontFamily: 'monospace',
              fontSize: '0.8125rem',
              color: '#34d399',
              maxHeight: '250px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              margin: 0
            }}>
              {diagnosticsLogs.join('\n')}
            </pre>
          </div>

        </div>
      </div>
    </div>
  )
}
