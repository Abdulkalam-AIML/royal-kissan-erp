import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(req: NextRequest) {
  try {
    // Authenticate the request
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll() {
            // No-op for API routes
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ response: 'Unauthorized. Please login first.' }, { status: 401 })
    }

    const { message } = await req.json()
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey || apiKey === 'placeholder_gemini_key') {
      return NextResponse.json({ response: 'Gemini API key not configured. Please add your GEMINI_API_KEY to environment variables.' })
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an AI business assistant for Royal Kissan Packaged Drinking Water ERP system. You help analyze sales data, inventory, profits, and provide business insights. Be concise and helpful. Answer in Indian context (use ₹ for currency, Indian date formats).

User question: ${message}`
            }]
          }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        })
      }
    )

    const data = await res.json()
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.'
    return NextResponse.json({ response: responseText })
  } catch (err) {
    console.error('AI API error:', err)
    return NextResponse.json({ response: 'Error connecting to AI service. Please try again.' }, { status: 500 })
  }
}
