// Purpose: 接收用户上传图片，调用Perfect Corp肤质分析API
// Params: FormData { image: File }
// Returns: { success, skinResult } | { success: false, error }

import { NextRequest, NextResponse } from 'next/server'
import { analyzeImage } from '@/lib/perfectcorp'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const image = formData.get('image') as File | null
    if (!image) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 })
    }

    logger.info('api/analyze', 'Starting skin analysis', { fileName: image.name, size: image.size })

    const arrayBuffer = await image.arrayBuffer()
    const mimeType = image.type || 'image/jpeg'
    const fileName = image.name || 'photo.jpg'

    const skinResult = await analyzeImage(arrayBuffer, mimeType, fileName)

    logger.info('api/analyze', 'Skin analysis done', { skinResult })
    return NextResponse.json({ success: true, skinResult })

  } catch (e) {
    const error = e instanceof Error ? e.message : 'Analysis failed'
    logger.error('api/analyze', 'Failed', { error })
    return NextResponse.json({ success: false, error }, { status: 500 })
  }
}
