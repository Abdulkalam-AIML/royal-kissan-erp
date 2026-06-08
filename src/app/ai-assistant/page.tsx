'use client'
import { useState } from 'react'
export default function AIAssistantPage() {
  const [messages, setMessages] = useState<{ role: 'user'|'assistant', content: string }[]>([
    { role: 'assistant', content: 'Hello! I am your Royal Kissan AI Assistant powered by Gemini. I can help you analyze sales, check inventory status, calculate profits, and answer business questions. How can I help you today?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  async function sendMessage() {
    if (!input.trim()) return
    const userMsg = { role: 'user' as const, content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: input }) })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response || 'Sorry, I could not process that request. Please check your Gemini API key in settings.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'API not configured yet. Please add your Gemini API key to .env.local file.' }])
    } finally { setLoading(false) }
  }
  return (
    <div>
      <div className="page-header"><div><h2 className="page-title">🤖 AI Business Assistant</h2><p className="page-subtitle">Powered by Google Gemini Flash – Ask anything about your business</p></div></div>
      <div style={{ maxWidth: '800px' }}>
        <div className="card">
          <div style={{ height: '400px', overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '80%', padding: '0.875rem 1.125rem', borderRadius: msg.role === 'user' ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem', background: msg.role === 'user' ? 'hsl(217 91% 60%)' : 'hsl(222 47% 11%)', border: msg.role === 'assistant' ? '1px solid hsl(217 32% 17%)' : 'none', color: 'hsl(210 40% 98%)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  {msg.role === 'assistant' && <div style={{ fontSize: '0.7rem', color: 'hsl(217 91% 70%)', fontWeight: '700', marginBottom: '0.375rem' }}>🤖 Gemini AI</div>}
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ padding: '0.875rem 1.125rem', borderRadius: '1rem 1rem 1rem 0.25rem', background: 'hsl(222 47% 11%)', border: '1px solid hsl(217 32% 17%)', color: 'hsl(215 20% 55%)', fontSize: '0.875rem' }}>🤖 Thinking...</div></div>}
          </div>
          <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid hsl(217 32% 17%)', display: 'flex', gap: '0.75rem' }}>
            <input className="form-input" placeholder="Ask about sales, inventory, profits..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()} />
            <button onClick={sendMessage} disabled={loading || !input.trim()} className="btn btn-primary" style={{ flexShrink: 0 }}>Send 🚀</button>
          </div>
        </div>
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="card-header"><h3 className="card-title">💡 Suggested Questions</h3></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {['What are today\'s total sales?', 'Which product sells the most?', 'What are this month\'s expenses?', 'How many cans are in stock?', 'Who has outstanding dues?', 'Calculate this month\'s profit'].map(q => (
                <button key={q} onClick={() => setInput(q)} className="btn btn-secondary btn-sm" style={{ textAlign: 'left', justifyContent: 'flex-start' }}>{q}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
