import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateAndFormatIndianPhone } from '@/lib/services/whatsapp-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { phone } = body

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Fetch WhatsApp settings to find default phone if not provided
    const { data: settings } = await supabase
      .from('whatsapp_settings')
      .select('*')
      .eq('organization_id', 'default_org')
      .maybeSingle()

    const targetRawPhone = phone || settings?.default_recipient_phone || '+919347662554'

    // 2. Validate Indian phone number
    const validation = validateAndFormatIndianPhone(targetRawPhone)
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: validation.error || 'Invalid Indian mobile number (+91)'
      }, { status: 400 })
    }

    const targetPhoneE164 = validation.e164Digits // e.g. 919347662554
    const formattedDisplayPhone = validation.formattedPhone // e.g. +919347662554

    const nowFormatted = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    })

    const testMessage = `*ROYAL KISSAN ERP — TEST NOTIFICATION*

Hello,

This is a test notification from the Royal Kissan ERP WhatsApp Integration.
Your WhatsApp connection is functioning properly!

*Details:*
Recipient: ${formattedDisplayPhone}
Timestamp: ${nowFormatted}
System: Royal Kissan ERP v2.4 (Production)

Thank you.
*ROYAL KISSAN ERP*`

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || settings?.access_token
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || settings?.phone_number_id

    // Log queued test notification
    const { data: notifRecord } = await supabase
      .from('whatsapp_notifications')
      .insert({
        recipient_phone: formattedDisplayPhone,
        recipient_name: 'Administrator',
        recipient_type: 'admin',
        message_type: 'test_notification',
        message_content: testMessage,
        status: 'QUEUED',
        retry_count: 0
      })
      .select()
      .single()

    const notifId = notifRecord?.id

    if (accessToken && phoneNumberId) {
      try {
        const metaApiUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`
        const metaPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: targetPhoneE164,
          type: 'text',
          text: {
            preview_url: false,
            body: testMessage
          }
        }

        const metaResponse = await fetch(metaApiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(metaPayload)
        })

        const metaJson = await metaResponse.json()

        if (metaResponse.ok && metaJson.messages?.[0]?.id) {
          const metaMsgId = metaJson.messages[0].id
          if (notifId) {
            await supabase
              .from('whatsapp_notifications')
              .update({
                status: 'SENT',
                meta_message_id: metaMsgId,
                sent_at: new Date().toISOString(),
                error_message: null
              })
              .eq('id', notifId)
          }

          return NextResponse.json({
            success: true,
            status: 'SENT',
            messageId: metaMsgId,
            recipient: formattedDisplayPhone,
            message: `Test WhatsApp message sent successfully to ${formattedDisplayPhone} via Meta Cloud API!`
          })
        } else {
          const errorMsg = metaJson.error?.message || `Meta API Error (${metaResponse.status})`
          if (notifId) {
            await supabase
              .from('whatsapp_notifications')
              .update({
                status: 'FAILED',
                error_message: errorMsg
              })
              .eq('id', notifId)
          }

          return NextResponse.json({
            success: false,
            status: 'FAILED',
            error: errorMsg,
            message: `Meta API delivery failed: ${errorMsg}`
          }, { status: 502 })
        }
      } catch (err: any) {
        const netErr = `Network error connecting to Meta API: ${err?.message || err}`
        if (notifId) {
          await supabase
            .from('whatsapp_notifications')
            .update({
              status: 'FAILED',
              error_message: netErr
            })
            .eq('id', notifId)
        }

        return NextResponse.json({
          success: false,
          status: 'FAILED',
          error: netErr,
          message: netErr
        }, { status: 502 })
      }
    } else {
      // Sandbox mode
      const simulatedMsgId = `wamid.test.simulated.${Date.now()}`
      if (notifId) {
        await supabase
          .from('whatsapp_notifications')
          .update({
            status: 'SENT',
            meta_message_id: simulatedMsgId,
            sent_at: new Date().toISOString(),
            error_message: 'Simulated test dispatch (credentials not configured)'
          })
          .eq('id', notifId)
      }

      return NextResponse.json({
        success: true,
        status: 'SENT',
        simulated: true,
        messageId: simulatedMsgId,
        recipient: formattedDisplayPhone,
        message: `Test WhatsApp message generated and recorded for ${formattedDisplayPhone} (Sandbox mode). To send live WhatsApp pings, configure Meta Access Token and Phone Number ID.`
      })
    }
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: `Internal server error: ${err?.message || err}`
    }, { status: 500 })
  }
}

