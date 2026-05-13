// Purpose: 用 Qwen Vision (via OpenRouter) 分析皮肤状况
// 上传图片 → base64 → Qwen Vision → 解析JSON评分

import { logger } from './logger'

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY!

export interface SkinAnalysisResult {
  acne: number
  wrinkle: number
  darkCircle: number
  pore: number
  spot: number
  radiance: number
  texture: number
  moisture: number
}

export async function analyzeImage(fileBuffer: ArrayBuffer, mimeType: string, fileName: string): Promise<SkinAnalysisResult> {
  logger.info('vision', 'Starting skin analysis', { fileName, size: fileBuffer.byteLength })

  const base64 = Buffer.from(fileBuffer).toString('base64')
  const dataUrl = `data:${mimeType};base64,${base64}`

  const prompt = `You are a professional skin analysis AI. Analyze this face photo and provide skin condition scores.

Return ONLY a valid JSON object with these exact fields (scores 0-100, where 100 = perfect/healthy):
{
  "acne": <score>,
  "wrinkle": <score>,
  "darkCircle": <score>,
  "pore": <score>,
  "spot": <score>,
  "radiance": <score>,
  "texture": <score>,
  "moisture": <score>
}

Scoring guide:
- acne: 100 = no acne, 0 = severe acne
- wrinkle: 100 = no wrinkles, 0 = many deep wrinkles  
- darkCircle: 100 = no dark circles, 0 = very dark circles
- pore: 100 = invisible pores, 0 = very enlarged pores
- spot: 100 = no spots, 0 = many spots/hyperpigmentation
- radiance: 100 = glowing skin, 0 = dull skin
- texture: 100 = smooth texture, 0 = very rough texture
- moisture: 100 = well hydrated, 0 = very dry skin

Return ONLY the JSON, no explanation, no markdown.`

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen/qwen3.6-flash',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUrl } },
          { type: 'text', text: prompt }
        ]
      }],
      max_tokens: 200,
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!res.ok) {
    const text = await res.text()
    logger.error('vision', 'API failed', { status: res.status, body: text })
    throw new Error(`Vision API failed: ${res.status}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || ''
  logger.debug('vision', 'Raw response', { content })

  return parseVisionResult(content)
}

function parseVisionResult(content: string): SkinAnalysisResult {
  try {
    // 提取JSON，去掉think标签和markdown
    const cleaned = content
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .replace(/```json|```/g, '')
      .trim()

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')

    const parsed = JSON.parse(jsonMatch[0])
    logger.info('vision', 'Parsed scores', { parsed })

    return {
      acne:       clamp(Number(parsed.acne ?? 70)),
      wrinkle:    clamp(Number(parsed.wrinkle ?? 70)),
      darkCircle: clamp(Number(parsed.darkCircle ?? 70)),
      pore:       clamp(Number(parsed.pore ?? 70)),
      spot:       clamp(Number(parsed.spot ?? 70)),
      radiance:   clamp(Number(parsed.radiance ?? 70)),
      texture:    clamp(Number(parsed.texture ?? 70)),
      moisture:   clamp(Number(parsed.moisture ?? 70)),
    }
  } catch (e) {
    logger.error('vision', 'Parse failed, using defaults', { content, error: String(e) })
    // 解析失败返回默认中等分数
    return { acne: 65, wrinkle: 70, darkCircle: 68, pore: 72, spot: 75, radiance: 68, texture: 70, moisture: 65 }
  }
}

function clamp(val: number): number {
  return Math.round(Math.max(0, Math.min(100, val)))
}
