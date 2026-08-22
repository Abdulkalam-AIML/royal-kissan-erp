import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key || url.includes('placeholder')) {
      return NextResponse.json({
        status: 'error',
        db: 'offline',
        message: 'Supabase URL or Key missing or placeholder',
      })
    }

    // Ping Supabase with a 1500ms timeout guard
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 1500)

    try {
      const res = await fetch(`${url}/rest/v1/products?select=id&limit=1`, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        return NextResponse.json({
          status: 'ok',
          db: 'connected',
          message: 'Database operational',
        })
      } else {
        return NextResponse.json({
          status: 'warning',
          db: 'error',
          statusCode: res.status,
          message: `Database HTTP ${res.status}`,
        })
      }
    } catch (e: any) {
      clearTimeout(timeoutId)
      return NextResponse.json({
        status: 'error',
        db: 'offline',
        message: e.name === 'AbortError' ? 'Database query timeout' : 'Database network unreachable',
      })
    }
  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      db: 'offline',
      message: err.message || 'System error',
    })
  }
}
