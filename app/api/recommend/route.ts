// Purpose: 根据肤质分析结果，通过多LLM智能路由生成护肤建议
// Params: { skinResult: SkinAnalysisResult }
// Returns: { success, recommendation, provider, chain, switchedToFallback }

import { NextRequest, NextResponse } from 'next/server'
import { routeLLM } from '@/lib/llm-router'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { skinResult } = body

    if (!skinResult) {
      return NextResponse.json({ success: false, error: 'No skin data provided' }, { status: 400 })
    }

    logger.info('api/recommend', 'Generating recommendation', { skinResult })

    const prompt = `You are a professional skincare consultant. Based on the following AI skin analysis results (scores 0-100, higher means more severe for issues, higher means better for radiance/moisture/texture):

Acne: ${skinResult.acne}/100
Wrinkles: ${skinResult.wrinkle}/100
Dark Circles: ${skinResult.darkCircle}/100
Pores: ${skinResult.pore}/100
Spots: ${skinResult.spot}/100
Radiance: ${skinResult.radiance}/100
Texture: ${skinResult.texture}/100
Moisture: ${skinResult.moisture}/100

Please provide:
1. A brief overall skin assessment (2 sentences)
2. Top 3 specific skincare recommendations with product types
3. One lifestyle tip

Keep the response concise and friendly. Use English.`

    const { result, provider, chain, switchedToFallback } = await routeLLM(prompt)

    logger.info('api/recommend', 'Done', { provider, switchedToFallback })
    return NextResponse.json({
      success: true,
      recommendation: result,
      provider,
      chain,
      switchedToFallback
    })

  } catch (e) {
    const error = e instanceof Error ? e.message : 'Recommendation failed'
    logger.error('api/recommend', 'Failed', { error })
    return NextResponse.json({ success: false, error }, { status: 500 })
  }
}
