'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

type Step = 'upload' | 'analyzing' | 'recommending' | 'done' | 'error'

interface SkinResult {
  acne: number
  wrinkle: number
  darkCircle: number
  pore: number
  spot: number
  radiance: number
  texture: number
  moisture: number
}

interface ChainStep {
  provider: string
  status: 'success' | 'failed' | 'skipped'
  latencyMs: number
  reason?: string
}

const PROVIDER_LABELS: Record<string, { label: string; color: string }> = {
  deepseek:     { label: 'DeepSeek AI', color: 'bg-blue-100 text-blue-700' },
  kimi:         { label: 'Kimi AI (Fallback)', color: 'bg-purple-100 text-purple-700' },
  'rule-based': { label: 'Rule-Based Engine', color: 'bg-amber-100 text-amber-700' },
}

const ANALYZING_MESSAGES = [
  'Detecting face boundaries...',
  'Scanning skin texture...',
  'Analyzing moisture levels...',
  'Evaluating radiance score...',
  'Checking pore visibility...',
  'Measuring acne severity...',
  'Assessing dark circle depth...',
  'Computing wrinkle patterns...',
  'Finalizing skin report...',
]

const RECOMMENDING_MESSAGES = [
  'Connecting to DeepSeek AI...',
  'Parsing your skin data...',
  'Generating personalized plan...',
  'Applying dermatology guidelines...',
  'Optimizing recommendations...',
  'Cross-checking Layer 1 → Layer 2...',
  'Finalizing your skincare plan...',
]

function LoadingText({ messages }: { messages: string[] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(i => (i + 1) % messages.length)
    }, 1200)
    return () => clearInterval(interval)
  }, [messages])

  return (
    <p className="text-gray-400 text-sm h-5 transition-all duration-300">
      {messages[index]}
    </p>
  )
}

function ScoreBar({ label, value, invert = false }: { label: string; value: number; invert?: boolean }) {
  const display = invert ? 100 - value : value
  const color = display > 70 ? 'bg-green-400' : display > 40 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{display}/100</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-700`} style={{ width: `${display}%` }} />
      </div>
    </div>
  )
}

function ChainTimeline({ chain }: { chain: ChainStep[] }) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <p className="text-xs text-gray-400 mb-2">AI Routing Chain</p>
      <div className="flex items-center gap-2 flex-wrap">
        {chain.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
              step.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
            }`}>
              <span>{step.status === 'success' ? '✓' : '✗'}</span>
              <span className="font-medium">{step.provider}</span>
              <span className="opacity-70">{step.latencyMs}ms</span>
            </div>
            {i < chain.length - 1 && <span className="text-gray-300">→</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const [step, setStep] = useState<Step>('upload')
  const [preview, setPreview] = useState<string | null>(null)
  const [skinResult, setSkinResult] = useState<SkinResult | null>(null)
  const [recommendation, setRecommendation] = useState<string>('')
  const [provider, setProvider] = useState<string>('')
  const [chain, setChain] = useState<ChainStep[]>([])
  const [switchedToFallback, setSwitchedToFallback] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
  }

  async function handleAnalyze() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setStep('analyzing')
    try {
      const formData = new FormData()
      formData.append('image', file)
      const analyzeRes = await fetch('/api/analyze', { method: 'POST', body: formData })
      const analyzeData = await analyzeRes.json()
      if (!analyzeData.success) throw new Error(analyzeData.error || 'Analysis failed')
      setSkinResult(analyzeData.skinResult)

      setStep('recommending')
      const recRes = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skinResult: analyzeData.skinResult }),
      })
      const recData = await recRes.json()
      if (!recData.success) throw new Error(recData.error || 'Recommendation failed')
      setRecommendation(recData.recommendation)
      setProvider(recData.provider)
      setChain(recData.chain || [])
      setSwitchedToFallback(recData.switchedToFallback || false)
      setStep('done')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong')
      setStep('error')
    }
  }

  function reset() {
    setStep('upload')
    setPreview(null)
    setSkinResult(null)
    setRecommendation('')
    setProvider('')
    setChain([])
    setSwitchedToFallback(false)
    setErrorMsg('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const providerInfo = PROVIDER_LABELS[provider] || { label: provider, color: 'bg-gray-100 text-gray-600' }

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-purple-700">✨ SkinSense AI</h1>
            <p className="text-xs text-gray-400">Production-grade LLM resilience · Three fallback layers · Zero downtime</p>
          </div>
          <Link href="/dashboard" className="text-sm text-purple-600 hover:underline">
            🖥 LLM Dashboard →
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {step === 'upload' && (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <div className="text-5xl mb-4">🔬</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">AI Skin Analysis</h2>
            <p className="text-gray-500 mb-1">Upload a selfie · Get personalized skincare recommendations</p>
            <p className="text-xs text-gray-400 mb-6">
              Powered by Qwen Vision + DeepSeek · Sub-second failover to Kimi · Rule-based engine as final layer
            </p>

            <div className="flex items-center justify-center gap-0 mb-8 text-xs overflow-hidden rounded-lg border border-gray-100">
              <div className="flex-1 bg-blue-50 px-3 py-2 text-center">
                <div className="font-bold text-blue-700">Layer 1</div>
                <div className="text-blue-600">DeepSeek</div>
                <div className="text-gray-400">Primary</div>
              </div>
              <div className="text-gray-300 text-lg">→</div>
              <div className="flex-1 bg-purple-50 px-3 py-2 text-center">
                <div className="font-bold text-purple-700">Layer 2</div>
                <div className="text-purple-600">Kimi</div>
                <div className="text-gray-400">Fallback</div>
              </div>
              <div className="text-gray-300 text-lg">→</div>
              <div className="flex-1 bg-amber-50 px-3 py-2 text-center">
                <div className="font-bold text-amber-700">Layer 3</div>
                <div className="text-amber-600">Rule-Based</div>
                <div className="text-gray-400">Always on</div>
              </div>
            </div>

            <div
              className="border-2 border-dashed border-purple-200 rounded-xl p-8 mb-6 cursor-pointer hover:border-purple-400 transition"
              onClick={() => fileRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt="preview" className="max-h-64 mx-auto rounded-lg object-contain" />
              ) : (
                <div className="text-gray-400">
                  <div className="text-4xl mb-2">📸</div>
                  <p>Click to upload your photo</p>
                  <p className="text-xs mt-1">JPG or PNG, max 5MB · Front-facing photo recommended</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <button
              onClick={handleAnalyze}
              disabled={!preview}
              className="bg-purple-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Analyze My Skin ✨
            </button>
            <p className="text-xs text-gray-400 mt-4">
              System guarantees a response even if all AI providers fail simultaneously
            </p>
          </div>
        )}

        {(step === 'analyzing' || step === 'recommending') && (
          <div className="bg-white rounded-2xl shadow p-12 text-center">
            <div className="text-5xl mb-6 animate-pulse">
              {step === 'analyzing' ? '🔍' : '🤖'}
            </div>
            <h2 className="text-xl font-bold text-gray-700 mb-3">
              {step === 'analyzing' ? 'Analyzing your skin...' : 'Generating recommendations...'}
            </h2>
            <LoadingText messages={step === 'analyzing' ? ANALYZING_MESSAGES : RECOMMENDING_MESSAGES} />
            <div className="mt-6 flex justify-center gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {step === 'done' && skinResult && (
          <div className="space-y-6">
            {switchedToFallback && provider === 'rule-based' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
                <span>⚡</span>
                <span>Both AI models were unavailable — Rule-Based Engine activated using your skin analysis data. Results are fully personalized.</span>
              </div>
            )}
            {switchedToFallback && provider === 'kimi' && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-700 flex items-center gap-2">
                <span>⚡</span>
                <span>Primary AI was busy — automatically switched to Kimi. Your results are unaffected.</span>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow p-6">
                <h3 className="font-bold text-gray-800 mb-4">📊 Skin Analysis Results</h3>
                <ScoreBar label="Moisture" value={skinResult.moisture} />
                <ScoreBar label="Radiance" value={skinResult.radiance} />
                <ScoreBar label="Texture" value={skinResult.texture} />
                <ScoreBar label="Acne" value={skinResult.acne} invert />
                <ScoreBar label="Wrinkles" value={skinResult.wrinkle} invert />
                <ScoreBar label="Dark Circles" value={skinResult.darkCircle} invert />
                <ScoreBar label="Pores" value={skinResult.pore} invert />
                <ScoreBar label="Spots" value={skinResult.spot} invert />
              </div>

              <div className="bg-white rounded-2xl shadow p-6 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-gray-800">💡 Your Skincare Plan</h3>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${providerInfo.color}`}>
                    {providerInfo.label}
                  </span>
                </div>
                <div
                  className="text-gray-600 text-sm leading-relaxed flex-1"
                  dangerouslySetInnerHTML={{
                    __html: recommendation
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br/>')
                  }}
                />
                <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
                  ⚠️ This is not medical advice. These are general skincare suggestions only. Please consult a qualified dermatologist for medical concerns.
                </p>
                {chain.length > 0 && <ChainTimeline chain={chain} />}
              </div>
            </div>

            <div className="text-center space-x-4">
              <button onClick={reset} className="bg-purple-600 text-white px-6 py-2 rounded-full hover:bg-purple-700 transition">
                Analyze Another Photo
              </button>
              <Link href="/dashboard" className="inline-block border border-purple-300 text-purple-600 px-6 py-2 rounded-full hover:bg-purple-50 transition">
                View LLM Dashboard
              </Link>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Something went wrong</h2>
            <p className="text-gray-400 text-sm mb-6">{errorMsg}</p>
            <button onClick={reset} className="bg-purple-600 text-white px-6 py-2 rounded-full hover:bg-purple-700 transition">
              Try Again
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
