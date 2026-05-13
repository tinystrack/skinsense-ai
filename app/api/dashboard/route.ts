// Purpose: 返回LLM调用历史（含完整链路），供Dashboard时间轴展示
// Returns: { success, history }

import { NextResponse } from 'next/server'
import { getCallHistory } from '@/lib/llm-router'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const history = getCallHistory()
    logger.debug('api/dashboard', 'History fetched', { count: history.length })
    return NextResponse.json({ success: true, history })
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Failed'
    logger.error('api/dashboard', 'Failed', { error })
    return NextResponse.json({ success: false, history: [] }, { status: 500 })
  }
}
