// Purpose: 多LLM智能路由器
// 正常: DeepSeek(主力，低成本) → Kimi(fallback)
// 兜底: Rule-Based Engine，基于皮肤分析数据生成个性化建议
// 每次调用记录完整链路供Dashboard时间轴展示

import { logger } from './logger'

export type LLMProvider = 'deepseek' | 'kimi' | 'rule-based'

export interface LLMCallRecord {
  id: string
  timestamp: string
  provider: LLMProvider
  success: boolean
  latencyMs: number
  reason?: string
  chain: ChainStep[]
}

export interface ChainStep {
  provider: LLMProvider
  status: 'success' | 'failed' | 'skipped'
  latencyMs: number
  reason?: string
}

const callHistory: LLMCallRecord[] = []

export function getCallHistory(): LLMCallRecord[] {
  return callHistory.slice(-50)
}

// Rule-Based Engine: 根据皮肤数据生成个性化建议
function generateRuleBasedRecommendation(prompt: string): string {
  // 从 prompt 中提取分数
  const extract = (key: string) => {
    const match = prompt.match(new RegExp(`${key}:\\s*(\\d+)`))
    return match ? parseInt(match[1]) : 70
  }

  const acne = extract('Acne')
  const wrinkle = extract('Wrinkles')
  const darkCircle = extract('Dark Circles')
  const pore = extract('Pores')
  const spot = extract('Spots')
  const radiance = extract('Radiance')
  const moisture = extract('Moisture')

  const concerns: string[] = []
  const recs: string[] = []

  // Overall assessment
  const avgScore = (acne + wrinkle + darkCircle + pore + spot + radiance + moisture) / 7
  const overall = avgScore > 70
    ? "Your skin is generally healthy with some areas needing attention."
    : avgScore > 50
    ? "Your skin shows moderate concerns that can be improved with the right routine."
    : "Your skin needs targeted care across multiple areas."

  // Rule-based recommendations
  if (acne < 40) {
    concerns.push(`Acne ${acne}/100 (needs attention)`)
    recs.push("**Acne & Pores:** Use a salicylic acid (2% BHA) cleanser morning and evening to unclog pores and reduce breakouts.")
  } else if (acne < 70) {
    concerns.push(`Acne ${acne}/100 (mild)`)
    recs.push("**Acne:** Spot-treat with benzoyl peroxide (2.5%) and avoid heavy occlusive moisturizers.")
  }

  if (wrinkle < 40) {
    concerns.push(`Wrinkles ${wrinkle}/100 (needs attention)`)
    recs.push("**Anti-aging:** Apply a retinol serum (0.3–0.5%) at night, 3x/week to stimulate collagen and smooth fine lines.")
  } else if (wrinkle < 70) {
    recs.push("**Wrinkles:** Add a peptide-rich eye cream and use SPF 50+ daily to prevent further UV-related aging.")
  }

  if (darkCircle < 50) {
    concerns.push(`Dark Circles ${darkCircle}/100 (concerning)`)
    recs.push("**Dark Circles:** Use a caffeine-infused eye cream in the morning to depuff and brighten the under-eye area.")
  }

  if (pore < 40) {
    concerns.push(`Pores ${pore}/100 (enlarged)`)
    recs.push("**Pores:** Apply niacinamide (5–10%) serum daily to minimize pore appearance and regulate sebum.")
  }

  if (spot < 50) {
    concerns.push(`Spots ${spot}/100 (hyperpigmentation)`)
    recs.push("**Spots:** Use a vitamin C serum (10–15% L-ascorbic acid) in the morning to brighten and fade dark spots.")
  }

  if (moisture < 50) {
    recs.push("**Hydration:** Layer a hyaluronic acid serum under a ceramide-rich moisturizer to restore your moisture barrier.")
  } else if (moisture > 80) {
    recs.push("**Hydration:** Your moisture levels are excellent — maintain with a lightweight daily moisturizer.")
  }

  if (radiance < 50) {
    recs.push("**Radiance:** Exfoliate with a gentle AHA (glycolic acid 5–7%) twice weekly to reveal brighter skin.")
  }

  // Lifestyle tip
  const lifestyleTip = acne < 50 || darkCircle < 50
    ? "**Lifestyle:** Prioritize 7–8 hours of quality sleep and reduce high-glycemic foods — both directly impact acne and dark circles."
    : "**Lifestyle:** Stay hydrated with 8+ glasses of water daily and apply SPF 30+ every morning, even indoors."

  if (recs.length === 0) {
    recs.push("**Overall:** Your skin is in great shape! Maintain your routine with a gentle cleanser, moisturizer, and daily SPF.")
  }

  const concernLine = concerns.length > 0
    ? `Primary concerns: ${concerns.join(', ')}\n\n`
    : ''

  return `**Overall Assessment:**\n${overall}\n\n${concernLine}**Personalized Recommendations:**\n${recs.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\n${lifestyleTip}`
}

async function callDeepSeek(prompt: string): Promise<string> {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`DeepSeek ${res.status}`)
  const data = await res.json()
  return data.choices[0].message.content
}

async function callKimi(prompt: string): Promise<string> {
  const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.KIMI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'moonshot-v1-8k',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Kimi ${res.status}`)
  const data = await res.json()
  return data.choices[0].message.content
}

export interface RouteResult {
  result: string
  provider: LLMProvider
  chain: ChainStep[]
  switchedToFallback: boolean
}

export async function routeLLM(prompt: string): Promise<RouteResult> {
  const chain: ChainStep[] = []
  const recordId = Date.now().toString()

  // 第一层：DeepSeek
  const t1 = Date.now()
  try {
    const result = await callDeepSeek(prompt)
    const step: ChainStep = { provider: 'deepseek', status: 'success', latencyMs: Date.now() - t1 }
    chain.push(step)
    callHistory.push({ id: recordId, timestamp: new Date().toISOString(), provider: 'deepseek', success: true, latencyMs: step.latencyMs, chain })
    if (callHistory.length > 200) callHistory.shift()
    logger.info('llm-router', 'DeepSeek success', { latency: step.latencyMs })
    return { result, provider: 'deepseek', chain, switchedToFallback: false }
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'Unknown'
    chain.push({ provider: 'deepseek', status: 'failed', latencyMs: Date.now() - t1, reason })
    logger.warn('llm-router', 'DeepSeek failed, switching to Kimi', { reason })
  }

  // 第二层：Kimi
  const t2 = Date.now()
  try {
    const result = await callKimi(prompt)
    const step: ChainStep = { provider: 'kimi', status: 'success', latencyMs: Date.now() - t2, reason: 'Switched from DeepSeek' }
    chain.push(step)
    callHistory.push({ id: recordId, timestamp: new Date().toISOString(), provider: 'kimi', success: true, latencyMs: chain.reduce((s, c) => s + c.latencyMs, 0), reason: 'DeepSeek unavailable', chain })
    if (callHistory.length > 200) callHistory.shift()
    logger.info('llm-router', 'Kimi fallback success', { latency: step.latencyMs })
    return { result, provider: 'kimi', chain, switchedToFallback: true }
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'Unknown'
    chain.push({ provider: 'kimi', status: 'failed', latencyMs: Date.now() - t2, reason })
    logger.warn('llm-router', 'Kimi failed, using rule-based engine', { reason })
  }

  // 第三层：Rule-Based Engine
  const result = generateRuleBasedRecommendation(prompt)
  chain.push({ provider: 'rule-based', status: 'success', latencyMs: 0, reason: 'All LLMs unavailable — rule-based engine activated' })
  callHistory.push({ id: recordId, timestamp: new Date().toISOString(), provider: 'rule-based', success: true, latencyMs: chain.reduce((s, c) => s + c.latencyMs, 0), reason: 'All LLMs failed', chain })
  if (callHistory.length > 200) callHistory.shift()
  logger.warn('llm-router', 'Rule-based engine activated')
  return { result, provider: 'rule-based', chain, switchedToFallback: true }
}
