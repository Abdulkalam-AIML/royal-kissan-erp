import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET handler: Meta WhatsApp Cloud API Webhook Challenge Verification
 * Meta pings this endpoint when you configure the webhook URL in the Meta Developer Portal.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'royal_kissan_webhook_token_2026'

  if (mode === 'subscribe' && token === expectedToken) {
    return new Response(challenge || '', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  return new Response('Verification token mismatch or invalid mode', { status: 403 })
}

/**
 * POST handler: Meta WhatsApp Delivery & Read Receipts Webhook
 * Meta sends events when a message transitions: sent -> delivered -> read / failed
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || !body.entry) {
      return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
    const supabase = createClient(supabaseUrl, supabaseKey)

    let updatedCount = 0

    for (const entry of body.entry) {
      const changes = entry.changes || []
      for (const change of changes) {
        const value = change.value
        if (!value) continue

        // Process message status updates
        const statuses = value.statuses || []
        for (const statusObj of statuses) {
          const wamid = statusObj.id
          const rawStatus = (statusObj.status || '').toLowerCase()
          const timestamp = statusObj.timestamp
          const isoTime = timestamp ? new Date(parseInt(timestamp) * 1000).toISOString() : new Date().toISOString()

          let mappedStatus: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | null = null
          if (rawStatus === 'sent') mappedStatus = 'SENT'
          else if (rawStatus === 'delivered') mappedStatus = 'DELIVERED'
          else if (rawStatus === 'read') mappedStatus = 'READ'
          else if (rawStatus === 'failed') mappedStatus = 'FAILED'

          if (mappedStatus && wamid) {
            const updatePayload: Record<string, any> = {
              status: mappedStatus
            }

            if (mappedStatus === 'DELIVERED' || mappedStatus === 'READ') {
              updatePayload.delivered_at = isoTime
            }

            if (mappedStatus === 'FAILED' && statusObj.errors?.length) {
              updatePayload.error_message = statusObj.errors.map((e: any) => e.title || e.message).join('; ')
            }

            const { error } = await supabase
              .from('whatsapp_notifications')
              .update(updatePayload)
              .eq('meta_message_id', wamid)

            if (!error) {
              updatedCount++
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, processedUpdates: updatedCount })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: `Webhook processing error: ${err?.message || err}` },
      { status: 500 }
    )
  }
}

