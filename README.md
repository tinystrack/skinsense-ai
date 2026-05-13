# ✨ SkinSense AI

> Production-grade LLM resilience, demonstrated through AI skin analysis.  
> **Three fallback layers. Zero downtime.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-skin.tinystrack.com-7C3AED)](https://skin.tinystrack.com)
[![Dashboard](https://img.shields.io/badge/LLM%20Dashboard-Monitor-blue)](https://skin.tinystrack.com/dashboard)
[![Hackathon](https://img.shields.io/badge/DevNetwork%20AI%2BML%20Hackathon-2026-orange)](https://devnetwork-ai-ml-hack-2026.devpost.com/)

---

## 🧠 What is this?

Every production app using LLMs faces the same nightmare: **when your primary model goes down, your product breaks.**

SkinSense AI solves this with a **3-layer resilience architecture** that guarantees a response — even when multiple AI providers fail simultaneously.

The skin analysis use case is intentionally chosen to stress-test the system: it requires both **vision AI** (image understanding) and **text AI** (personalized recommendations), exposing the architecture to two independent points of failure.

---

## ⚡ How it works

```
Upload photo
    ↓
Qwen Vision → 8-dimension skin analysis (acne, wrinkles, pores, moisture, radiance, dark circles, spots, texture)
    ↓
Layer 1: DeepSeek (primary, low-cost)
    ↓ fails?
Layer 2: Kimi (fallback, sub-second switch)
    ↓ fails?
Layer 3: Rule-Based Engine (offline, always on, uses actual skin scores)
    ↓
User always gets a personalized response
```

**Real-time Dashboard** exposes the routing chain, fallback events, per-model latency, and cost savings vs GPT-4.

---

## 🏗️ Architecture

| Layer | Model | Role | Timeout | Cost/1K |
|-------|-------|------|---------|---------|
| Layer 1 | DeepSeek Chat | Primary | 8s | $0.0014 |
| Layer 2 | Kimi moonshot-v1-8k | Fallback | 8s | $0.012 |
| Layer 3 | Rule-Based Engine | Always on | 0ms | $0 |

### Rule-Based Engine
Layer 3 is **not** a static cache. It's a dermatology-guideline-based engine that uses the actual skin analysis scores:

- Acne < 40 → Salicylic acid (2% BHA) cleanser recommended
- Wrinkle < 40 → Retinol serum 0.3–0.5%, 3x/week
- Dark Circle < 50 → Caffeine-infused eye cream
- Pore < 40 → Niacinamide 5–10% serum
- Spot < 50 → Vitamin C serum 10–15%
- Moisture > 80 → Maintain current routine

Even when all AI providers fail, users receive **personalized** recommendations based on their actual skin data.

---

## 🛠️ Tech Stack

- **Frontend/Backend**: Next.js 15 + TypeScript + Tailwind CSS
- **Vision AI**: Qwen Vision (`qwen/qwen3.6-flash` via OpenRouter)
- **LLM Layer 1**: DeepSeek Chat API
- **LLM Layer 2**: Kimi (Moonshot AI)
- **LLM Layer 3**: Custom Rule-Based Engine
- **Deployment**: PM2 + Nginx + SSL

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- npm

### Installation

```bash
git clone https://github.com/tinystrack/skinsense-ai.git
cd skinsense-ai
npm install --ignore-scripts
cp .env.example .env
# Fill in your API keys in .env
npm run dev
```

### Environment Variables

```env
OPENROUTER_API_KEY=     # For Qwen Vision (skin analysis)
DEEPSEEK_API_KEY=       # Layer 1 LLM
KIMI_API_KEY=           # Layer 2 LLM (Moonshot AI)
NEXT_PUBLIC_APP_URL=    # Your deployment URL
```

---

## 📊 Dashboard

Visit `/dashboard` to see:
- Real-time LLM routing chain
- Fallback events and latency per model
- Cost optimization vs GPT-4
- Request timeline with expandable chain details

---

## 🔒 Security

- Next.js upgraded to fix **CVE-2025-66478** (CVSS 10.0 RCE vulnerability)
- No API keys hardcoded — all via environment variables
- `.env` excluded from repository

---

## 🏆 Hackathon

Built for **DevNetwork AI+ML Hackathon 2026**

- **TrueFoundry Challenge**: Production-grade LLM resilience with observable fallback architecture
- **Perfect Corp Challenge**: AI-powered consumer skin analysis experience

**Live Demo**: https://skin.tinystrack.com  
**Dashboard**: https://skin.tinystrack.com/dashboard

---

## 📁 Project Structure

```
skinsense-ai/
├── app/
│   ├── page.tsx                 # Main page (upload + results)
│   ├── dashboard/page.tsx       # LLM monitoring dashboard
│   └── api/
│       ├── analyze/route.ts     # Qwen Vision skin analysis
│       ├── recommend/route.ts   # Multi-LLM fallback recommendations
│       └── dashboard/route.ts   # Call history API
├── lib/
│   ├── perfectcorp.ts           # Qwen Vision API wrapper
│   ├── llm-router.ts            # 3-layer fallback core + Rule-Based Engine
│   └── logger.ts                # Unified logging
└── types/index.ts
```

---

Built with ❤️ by [TinyStack](https://tinystrack.com)
