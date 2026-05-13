import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SkinSense AI - Never-Failing Skin Analysis',
  description: 'AI-powered skin analysis with resilient multi-LLM recommendations',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}
