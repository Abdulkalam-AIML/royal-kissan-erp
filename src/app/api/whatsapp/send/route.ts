import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  formatPurchaseWhatsAppMessage,
  validateAndFormatIndianPhone
} from '@/lib/services/whatsapp-service'
import { PurchaseWithItems } from '@/lib/types/database'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { purchaseId, purchaseData, recipientPhone, forceResend } = body

    if (!purchaseId && !purchaseData?.id) {
      return NextResponse.json(
        { success: false, message: 'Missing purchaseId parameter.' },
        { status: 400 }
      )
    }

    const targetPurchaseId = purchaseId || purchaseData.id

    // Use service/anon supabase client for server-side processing
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Fetch Purchase with Items if not passed or verify it
    let fullPurchase: PurchaseWithItems | null = purchaseData || null

    if (!fullPurchase || !fullPurchase.items || fullPurchase.items.length === 0) {
      const { data: pData, error: pErr } = await supabase
        .from('purchases')
        .select('*, purchase_items(*)')
        .eq('id', targetPurchaseId)
        .maybeSingle()

      if (pErr || !pData) {
        return NextResponse.json(
          { success: false, message: `Purchase #${targetPurchaseId} not found in database.` },
          { status: 404 }
        )
      }

      fullPurchase = {
        ...pData,
        items: pData.purchase_items || []
      }
    }

    // 2. Fetch WhatsApp Settings
    const { data: settings } = await supabase
      .from('whatsapp_settings')
      .select('*')
      .eq('organization_id', 'default_org')
      .maybeSingle()

    const isEnabled = settings?.enabled !== false
    if (!isEnabled && !forceResend) {
      return NextResponse.json({
        success: false,
        status: 'DISABLED',
        message: 'WhatsApp notifications are disabled in System Settings.'
      })
    }

    // 3. Determine and Validate Target Recipient Phone
    let rawPhone = recipientPhone
    if (!rawPhone) {
      if (settings?.recipient_type === 'supplier' && fullPurchase?.supplier_phone) {
        rawPhone = fullPurchase.supplier_phone
      } else {
        rawPhone = settings?.default_recipient_phone || '+919347662554'
      }
    }

    const phoneValidation = validateAndFormatIndianPhone(rawPhone)
    if (!phoneValidation.isValid) {
      // Record failed notification in audit log
      await supabase.from('whatsapp_notifications').insert({
        purchase_id: fullPurchase?.id,
        purchase_number: fullPurchase?.purchase_number,
        recipient_phone: rawPhone || 'UNKNOWN',
        recipient_name: fullPurchase?.supplier_name,
        message_type: 'purchase_confirmation',
        message_content: 'Validation Failed',
        status: 'FAILED',
        error_message: phoneValidation.error || 'Invalid Indian phone number format.'
      })

      return NextResponse.json({
        success: false,
        status: 'FAILED',
        error: phoneValidation.error,
        message: phoneValidation.error
      }, { status: 400 })
    }

    const targetPhoneE164 = phoneValidation.e164Digits // e.g. 919347662554
    const formattedDisplayPhone = phoneValidation.formattedPhone // e.g. +919347662554

    // 4. Duplicate Prevention (Idempotency Window 30 seconds)
    const idempotencyKey = `wa_pur_${fullPurchase?.id}_${targetPhoneE164}_${forceResend ? Date.now() : Math.floor(Date.now() / 30000)}`

    if (!forceResend) {
      const { data: existing } = await supabase
        .from('whatsapp_notifications')
        .select('id, status, created_at')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({
          success: true,
          isDuplicate: true,
          status: existing.status,
          message: `Notification already queued/sent (Status: ${existing.status}). Duplicate prevented.`
        })
      }
    }

    // 5. Generate Professional WhatsApp Purchase Confirmation Message Text
    const messageContent = formatPurchaseWhatsAppMessage(fullPurchase!)

    // 6. Record Notification in QUEUED State
    const { data: notifRecord, error: notifInsertError } = await supabase
      .from('whatsapp_notifications')
      .insert({
        purchase_id: fullPurchase?.id,
        purchase_number: fullPurchase?.purchase_number,
        recipient_phone: formattedDisplayPhone,
        recipient_name: fullPurchase?.supplier_name,
        recipient_type: settings?.recipient_type || 'owner',
        message_type: 'purchase_confirmation',
        message_content: messageContent,
        status: 'QUEUED',
        idempotency_key: idempotencyKey,
        retry_count: 0
      })
      .select()
      .single()

    const notifId = notifRecord?.id

    // 7. Dispatch via Meta WhatsApp Business Cloud API
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || settings?.access_token
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || settings?.phone_number_id

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
            body: messageContent
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
            message: `WhatsApp message dispatched to ${formattedDisplayPhone} via Meta Cloud API!`
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
            recipient: formattedDisplayPhone,
            message: `Meta API delivery failed: ${errorMsg}`
          }, { status: 502 })
        }
      } catch (err: any) {
        const networkError = `Network connection to Meta API failed: ${err?.message || err}`
        if (notifId) {
          await supabase
            .from('whatsapp_notifications')
            .update({
              status: 'FAILED',
              error_message: networkError
            })
            .eq('id', notifId)
        }

        return NextResponse.json({
          success: false,
          status: 'FAILED',
          error: networkError,
          message: networkError
        }, { status: 502 })
      }
    } else {
      // Simulation / Development Sandbox mode
      // When live Meta Cloud API credentials are not yet configured in env or settings
      const simulatedMsgId = `wamid.simulated.${Date.now()}`
      const note = 'Dispatched in sandbox mode. To deliver live WhatsApp messages to physical phones, configure WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in System Settings.'

      if (notifId) {
        await supabase
          .from('whatsapp_notifications')
          .update({
            status: 'SENT',
            meta_message_id: simulatedMsgId,
            sent_at: new Date().toISOString(),
            error_message: note
          })
          .eq('id', notifId)
      }

      return NextResponse.json({
        success: true,
        status: 'SENT',
        simulated: true,
        messageId: simulatedMsgId,
        recipient: formattedDisplayPhone,
        message: `WhatsApp notification successfully formatted and recorded for ${formattedDisplayPhone}! (${note})`
      })
    }
  } catch (globalErr: any) {
    return NextResponse.json({
      success: false,
      message: `Internal server error: ${globalErr?.message || globalErr}`
    }, { status: 500 })
  }
}

