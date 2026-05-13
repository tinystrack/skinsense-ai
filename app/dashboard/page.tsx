'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ChainStep {
  provider: string
  status: 'success' | 'failed' | 'skipped'
  latencyMs: number
  reason?: string
}

interface CallRecord {
  id: string
  timestamp: string
  provider: string
  success: boolean
  latencyMs: number
  reason?: string
  chain: ChainStep[]
}

const PROVIDER_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  deepseek:     { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  kimi:         { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  'rule-based': { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500' },
}

// 估算成本（每1000 tokens，USD）
const COST_PER_1K: Record<string, number> = {
  deepseek: 0.0014,    // DeepSeek Chat ~$0.0014/1K tokens
  kimi: 0.012,         // Kimi ~$0.012/1K tokens
  'rule-based': 0,     // 免费
}
const AVG_TOKENS = 500 // 平均每次请求约500 tokens

function ChainBadge({ step }: { step: ChainStep }) {
  const isSuccess = step.status === 'success'
  return (
    <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
      isSuccess ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'
    }`}>
      <span>{isSuccess ? '✓' : '✗'}</span>
      <span className="font-medium">{step.provider}</span>
      <span className="opacity-60">{step.latencyMs}ms</span>
    </div>
  )
}

export default function Dashboard() {
  const [history, setHistory] = useState<CallRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  async function fetchHistory() {
    try {
      const res = await fetch('/api/dashboard')
      const data = await res.json()
      if (data.success) setHistory(data.history.reverse())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
    const interval = setInterval(fetchHistory, 5000)
    return () => clearInterval(interval)
  }, [])

  const total = history.length
  const deepseekCount = history.filter(h => h.provider === 'deepseek').length
  const kimiCount = history.filter(h => h.provider === 'kimi').length
  const ruleBasedCount = history.filter(h => h.provider === 'rule-based').length
  const fallbackRate = total > 0 ? Math.round(((kimiCount + ruleBasedCount) / total) * 100) : 0
  const avgLatency = total > 0 ? Math.round(history.reduce((s, h) => s + h.latencyMs, 0) / total) : 0

  // 计算节省的成本（对比全用GPT-4的情况）
  const GPT4_COST = 0.06 // GPT-4 ~$0.06/1K tokens
  const actualCost = history.reduce((sum, h) => {
    return sum + ((COST_PER_1K[h.provider] || 0) * AVG_TOKENS / 1000)
  }, 0)
  const gpt4Cost = total * GPT4_COST * AVG_TOKENS / 1000
  const savedCost = Math.max(0, gpt4Cost - actualCost)
  const savedPercent = gpt4Cost > 0 ? Math.round((savedCost / gpt4Cost) * 100) : 0

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">🖥 LLM Resilience Dashboard</h1>
            <p className="text-xs text-gray-400">Real-time routing monitor · Auto-refresh every 5s</p>
          </div>
          <Link href="/" className="text-sm text-purple-600 hover:underline">← Back to App</Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Requests', value: total, color: 'text-gray-800' },
            { label: 'DeepSeek (Primary)', value: deepseekCount, color: 'text-blue-600' },
            { label: 'Kimi / Rule-Based', value: kimiCount + ruleBasedCount, color: 'text-purple-600' },
            { label: 'Avg Latency', value: `${avgLatency}ms`, color: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl shadow p-4 text-center">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Cost Saved */}
        {total > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-bold text-gray-700 mb-4">💰 Cost Optimization</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">${savedCost.toFixed(4)}</div>
                <div className="text-xs text-gray-500 mt-1">Saved vs GPT-4</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{savedPercent}%</div>
                <div className="text-xs text-gray-500 mt-1">Cost reduction</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">${(actualCost).toFixed(4)}</div>
                <div className="text-xs text-gray-500 mt-1">Actual spend</div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              * Compared to routing all requests through GPT-4 (${GPT4_COST}/1K tokens). DeepSeek: $0.0014/1K · Kimi: $0.012/1K · Rule-Based: $0
            </p>
          </div>
        )}

        {/* Resilience Architecture */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-700">⚡ Resilience Architecture</h3>
            <span className="text-sm text-gray-500">
              Fallback rate: <span className={`font-bold ${fallbackRate > 30 ? 'text-red-500' : 'text-green-600'}`}>{fallbackRate}%</span>
            </span>
          </div>
          <div className="flex items-stretch gap-3 flex-wrap">
            {[
              { name: 'DeepSeek', desc: 'Primary · Low-cost', count: deepseekCount, color: 'border-blue-400 bg-blue-50 text-blue-700' },
              { name: 'Kimi', desc: 'Fallback · Enhanced', count: kimiCount, color: 'border-purple-400 bg-purple-50 text-purple-700' },
              { name: 'Rule-Based', desc: 'Offline · Instant', count: ruleBasedCount, color: 'border-amber-400 bg-amber-50 text-amber-700' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition ${item.count > 0 ? item.color : 'border-gray-200 bg-gray-50 text-gray-400'}`}>
                  <div className="font-bold">{item.name}</div>
                  <div className="text-xs font-normal opacity-80">{item.desc}</div>
                  <div className="text-lg font-bold mt-1">{item.count} <span className="text-xs font-normal">calls</span></div>
                </div>
                {i < 2 && <div className="text-gray-300 text-xl font-light">→</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-gray-700 mb-4">📋 Request Timeline</h3>
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading...</div>
          ) : history.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No requests yet. Go analyze a photo! 👆</div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {history.map(record => {
                const style = PROVIDER_STYLES[record.provider] || PROVIDER_STYLES['rule-based']
                const isExpanded = expanded === record.id
                return (
                  <div key={record.id} className="rounded-lg border border-gray-100 overflow-hidden">
                    <div
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:opacity-80 ${style.bg}`}
                      onClick={() => setExpanded(isExpanded ? null : record.id)}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                      <span className={`text-xs font-bold w-24 ${style.text}`}>{record.provider}</span>
                      <div className="flex items-center gap-1 flex-1">
                        {record.chain?.map((step, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <ChainBadge step={step} />
                            {i < record.chain.length - 1 && <span className="text-gray-300 text-xs">→</span>}
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                        {new Date(record.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-gray-300 text-xs">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                    {isExpanded && record.chain && (
                      <div className="px-4 py-3 bg-white border-t border-gray-100 space-y-2">
                        {record.chain.map((step, i) => (
                          <div key={i} className="flex items-start gap-3 text-xs text-gray-600">
                            <span className={`font-bold w-24 flex-shrink-0 ${step.status === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                              {step.status === 'success' ? '✓' : '✗'} {step.provider}
                            </span>
                            <span className="text-gray-400">{step.latencyMs}ms</span>
                            {step.reason && <span className="text-gray-400 italic">{step.reason}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
