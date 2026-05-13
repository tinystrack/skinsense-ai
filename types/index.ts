export interface AnalyzeResponse {
  success: boolean
  fileId?: string
  taskId?: string
  skinResult?: {
    acne: number
    wrinkle: number
    darkCircle: number
    pore: number
    spot: number
    radiance: number
    texture: number
    moisture: number
  }
  error?: string
}

export interface RecommendResponse {
  success: boolean
  recommendation?: string
  provider?: string
  error?: string
}

export interface DashboardResponse {
  success: boolean
  history: Array<{
    id: string
    timestamp: string
    provider: string
    success: boolean
    latencyMs: number
    reason?: string
  }>
}
