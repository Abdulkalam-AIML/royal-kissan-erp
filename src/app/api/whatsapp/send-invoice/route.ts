import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  formatInvoiceWhatsAppMessage,
  validateAndFormatIndianPhone
} from '@/lib/services/whatsapp-service'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      invoiceId,
      billData,
      recipientPhone,
      forceResend,
      pdfBase64,
      pdfFilename
    } = body

    if (!invoiceId && !billData?.id && !billData?.invoice_number) {
      return NextResponse.json(
        { success: false, message: 'Missing invoiceId or billData parameter.' },
        { status: 400 }
      )
    }

    const targetInvoiceId = invoiceId || billData?.id || null
    const invoiceNumber = billData?.invoice_number || billData?.bill_number || `INV-${targetInvoiceId ? String(targetInvoiceId).slice(0, 8).toUpperCase() : 'NEW'}`

    // Service/anon supabase client for server-side processing
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Fetch Bill with Items if not passed or verify it
    let fullBill: any = billData || null

    if (!fullBill || !fullBill.items || fullBill.items.length === 0) {
      if (targetInvoiceId) {
        const { data: bData } = await supabase
          .from('bills')
          .select('*, bill_items(*)')
          .eq('id', targetInvoiceId)
          .maybeSingle()

        if (bData) {
          fullBill = {
            ...bData,
            items: bData.bill_items || []
          }
        }
      }
    }

    if (!fullBill) {
      return NextResponse.json(
        { success: false, message: `Invoice #${invoiceNumber} details not found.` },
        { status: 404 }
      )
    }

    // Check if this is a load dispatch note
    const isDispatchNote = String(fullBill.bill_type || '').toUpperCase().includes('DISPATCH NOTE')

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
        message: 'WhatsApp notifications are currently disabled in System Settings.'
      })
    }

    // 3. Determine and Validate Target Recipient Phone
    let rawPhone = recipientPhone
    if (!rawPhone) {
      rawPhone = fullBill.dealer_phone || fullBill.customer_phone || settings?.default_recipient_phone || '+919347662554'
    }

    const phoneValidation = validateAndFormatIndianPhone(rawPhone)
    if (!phoneValidation.isValid) {
      // Record failed notification in audit log
      await supabase.from('whatsapp_notifications').insert({
        invoice_id: fullBill.id || null,
        invoice_number: invoiceNumber,
        bill_type: fullBill.bill_type || 'invoice',
        pdf_filename: pdfFilename || `Royal_Kissan_Invoice_${invoiceNumber}.pdf`,
        recipient_phone: rawPhone || 'UNKNOWN',
        recipient_name: fullBill.dealer_name || fullBill.customer_name || 'Customer',
        message_type: 'invoice_document',
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
    const recipientName = fullBill.dealer_name || fullBill.customer_name || 'Customer'
    const finalFilename = pdfFilename || `Royal_Kissan_Invoice_${invoiceNumber.replace(/[^\w-]/g, '_')}.pdf`

    // 4. Duplicate Prevention (Idempotency Window 30 seconds)
    const idempotencyKey = `wa_inv_${fullBill.id || invoiceNumber}_${targetPhoneE164}_${forceResend ? Date.now() : Math.floor(Date.now() / 30000)}`

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
          message: `Invoice notification already queued/sent (Status: ${existing.status}). Duplicate send prevented.`
        })
      }
    }

    // 5. Generate Professional WhatsApp Invoice Message Text
    const messageContent = formatInvoiceWhatsAppMessage(fullBill)

    // Construct WhatsApp Web direct link for fallback
    const waWebLink = `https://wa.me/${targetPhoneE164}?text=${encodeURIComponent(messageContent)}`

    // 6. Record Notification in QUEUED State
    const { data: notifRecord } = await supabase
      .from('whatsapp_notifications')
      .insert({
        invoice_id: fullBill.id || null,
        invoice_number: invoiceNumber,
        bill_type: fullBill.bill_type || 'invoice',
        pdf_filename: finalFilename,
        recipient_phone: formattedDisplayPhone,
        recipient_name: recipientName,
        recipient_type: fullBill.dealer_name ? 'dealer' : 'customer',
        message_type: 'invoice_document',
        message_content: messageContent,
        status: 'QUEUED',
        idempotency_key: idempotencyKey,
        retry_count: 0
      })
      .select()
      .single()

    const notifId = notifRecord?.id

    // 7. Dispatch via Meta WhatsApp Business Cloud API if credentials present
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || settings?.access_token
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || settings?.phone_number_id

    if (accessToken && phoneNumberId) {
      try {
        let mediaId: string | null = null

        // If PDF base64 is provided, upload it as a WhatsApp Media Document
        if (pdfBase64) {
          try {
            const pdfBuffer = Buffer.from(pdfBase64, 'base64')
            const formData = new FormData()
            const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
            formData.append('messaging_product', 'whatsapp')
            formData.append('file', blob, finalFilename)
            formData.append('type', 'application/pdf')

            const mediaUploadRes = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/media`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
              body: formData
            })

            const mediaJson = await mediaUploadRes.json()
            if (mediaUploadRes.ok && mediaJson.id) {
              mediaId = mediaJson.id
            } else {
              console.warn('Meta WhatsApp media upload warning:', mediaJson)
            }
          } catch (mediaErr) {
            console.warn('Failed to upload PDF media to Meta WhatsApp:', mediaErr)
          }
        }

        // Send Document Message if media uploaded, otherwise send formatted text
        const metaApiUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`
        const metaPayload: any = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: targetPhoneE164,
        }

        if (mediaId) {
          metaPayload.type = 'document'
          metaPayload.document = {
            id: mediaId,
            caption: messageContent,
            filename: finalFilename
          }
        } else {
          metaPayload.type = 'text'
          metaPayload.text = {
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
                media_id: mediaId || null,
                sent_at: new Date().toISOString(),
                error_message: null
              })
              .eq('id', notifId)
          }

          return NextResponse.json({
            success: true,
            status: 'SENT',
            messageId: metaMsgId,
            mediaId,
            hasDocumentAttachment: !!mediaId,
            recipient: formattedDisplayPhone,
            waLink: waWebLink,
            message: `Invoice successfully sent as WhatsApp document to ${formattedDisplayPhone} via Meta Cloud API!`
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
            waLink: waWebLink,
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
          waLink: waWebLink,
          message: networkError
        }, { status: 502 })
      }
    } else {
      // Simulation / Development Sandbox mode
      // When live Meta Cloud API credentials are not yet configured in env or settings
      const simulatedMsgId = `wamid.simulated.inv.${Date.now()}`
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
        hasDocumentAttachment: !!pdfBase64,
        waLink: waWebLink,
        isDispatchNote,
        message: `WhatsApp invoice notification successfully formatted and logged for ${formattedDisplayPhone}! (${note})`
      })
    }
  } catch (globalErr: any) {
    return NextResponse.json({
      success: false,
      message: `Internal server error: ${globalErr?.message || globalErr}`
    }, { status: 500 })
  }
}
