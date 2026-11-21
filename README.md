# CEREBRAS — LIVE AI SPEED CHALLENGE

A real-time AI inference speed and answer quality benchmark comparing **Cerebras** and **Groq** concurrently using Server-Sent Events (SSE), high-resolution monotonic backend timing (`process.hrtime.bigint()`), Recharts visualizations, live audience predictions/voting, multi-round benchmarking, and a full-screen event presentation mode.

## Project Structure

```text
.
├── server.ts                              # Express + Vite middleware / static production entrypoint
├── backend/
│   └── src/
│       ├── config/env.ts                  # Server-side environment variable configuration
│       ├── middleware/errorHandler.ts     # Safe Express error handler
│       ├── providers/
│       │   └── openaiCompatibleStream.ts  # Concurrent SSE streaming client for Cerebras & Groq
│       ├── routes/apiRoutes.ts            # REST & SSE API routes (/api/health, /api/models, /api/compare, /api/vote, /api/results)
│       ├── services/
│       │   ├── comparisonService.ts       # Concurrent comparison orchestrator & SSE event emitter
│       │   ├── modelsService.ts           # Live model catalog fetcher with safe fallback defaults
│       │   └── sessionStore.ts            # In-memory session store for audience votes & recent comparisons
│       ├── types/comparison.ts            # Backend TypeScript interfaces
│       └── utils/
│           ├── timing.ts                  # Monotonic hrtime timer
│           ├── tokenizer.ts               # Provider usage + js-tiktoken fallback & TPS calculation
│           └── validation.ts              # Input validation for prompts, models, parameters, and votes
└── src/
    ├── components/
    │   ├── AudienceSection.tsx            # Prediction outcome & useful-answer voting UI
    │   ├── Header.tsx                     # App header with live backend status & stage mode button
    │   ├── HeroSection.tsx                # Hero banner & server API key readiness strip
    │   ├── MultiRoundSummary.tsx          # 3/5-round breakdown & valid-run averages
    │   ├── PerformanceDashboard.tsx       # Winner banner, 6 metric cards & Recharts charts
    │   ├── PresentationModal.tsx          # Full-screen projector/stage presentation view
    │   ├── PromptArenaControl.tsx         # Prompt input, example prompts, fair settings & run buttons
    │   └── ProviderPanel.tsx              # Independent live streaming panel for Cerebras or Groq
    ├── hooks/useComparisonArena.ts        # State management, SSE stream consumer, stopwatch & multi-round logic
    ├── services/apiClient.ts              # Typed API & POST SSE stream parser
    ├── types/arena.ts                     # Frontend TypeScript interfaces
    ├── App.tsx                            # Main dashboard layout
    ├── index.css                          # Tailwind CSS v4 + typography & dark arena styles
    └── main.tsx                           # React root mount
```

## API Key Configuration

1. Copy `.env.example` to `.env` (or configure secrets in your hosting environment):
   ```bash
   cp .env.example .env
   ```
2. Set your backend API keys and preferred default models in `.env`:
   ```env
   CEREBRAS_API_KEY=your_cerebras_api_key
   GROQ_API_KEY=your_groq_api_key
   CEREBRAS_MODEL=gpt-oss-120b
   GROQ_MODEL=openai/gpt-oss-120b
   PORT=3000
   ```
3. Security notes:
   - `.env` is ignored via `.gitignore`.
   - API keys are read exclusively on the backend (`process.env`) and are never exposed to browser JavaScript or returned in API responses.

## Recommended Supported Model IDs

- **Cerebras** (`https://api.cerebras.ai/v1/chat/completions`):
  - `gpt-oss-120b` (Default — 120B parameter open-weight reasoning/coding model)
  - `qwen-3.8-27b` (27B Qwen model)
- **Groq** (`https://api.groq.com/openai/v1/chat/completions`):
  - `openai/gpt-oss-120b` (Default — matching 120B architecture for apples-to-apples comparison)
  - `llama-3.3-70b-versatile`
  - `llama-3.1-8b-instant`
  - `openai/gpt-oss-20b`
  - `qwen/qwen3.8-27b`

The backend `GET /api/models` endpoint automatically queries live model catalogs from Cerebras and Groq when configured.

## Installation & Running Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Building & Production Deployment

```bash
npm run build
NODE_ENV=production npm start
```

Set `CEREBRAS_API_KEY`, `GROQ_API_KEY`, `CEREBRAS_MODEL`, `GROQ_MODEL`, and `PORT` in your deployment platform's environment/secrets manager.
