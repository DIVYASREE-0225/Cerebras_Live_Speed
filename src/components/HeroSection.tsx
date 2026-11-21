import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import type { HealthStatus } from '../types/arena';

interface HeroSectionProps {
  health: HealthStatus | null;
  backendConnected: boolean | null;
  onRefreshConnection: () => void;
}

export function HeroSection({
  health,
  backendConnected,
  onRefreshConnection,
}: HeroSectionProps) {
  const cerebrasReady = health?.providers.cerebras.configured ?? false;
  const groqReady = health?.providers.groq.configured ?? false;
  const bothReady = cerebrasReady && groqReady;

  return (
    <section className="relative overflow-hidden border-b border-slate-800/70 pt-10 pb-8 sm:pt-12 sm:pb-10">
      {/* Subtle GPU-composited decorative ambient glow */}
      <div
        aria-hidden="true"
        className="arena-glow-orb pointer-events-none absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="arena-glow-orb pointer-events-none absolute -top-16 right-1/4 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-medium tracking-widest text-sky-400">
            Real-Time Inference Benchmark
          </p>
          <h1
            className="mt-2 font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl"
            style={{ textWrap: 'balance' }}
          >
            WHO RESPONDS FASTER?
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-300 sm:text-lg">
            Challenge two powerful AI inference platforms with the exact same prompt and watch
            their performance unfold live.
          </p>
        </div>

        {/* Honest Provider Key Configuration Status */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/80 pt-4 text-xs">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              {cerebrasReady ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" aria-hidden="true" />
              )}
              <span className="text-slate-300">
                Cerebras API Key:{' '}
                <strong className={cerebrasReady ? 'text-emerald-300' : 'text-amber-300'}>
                  {cerebrasReady ? 'Configured on Server' : 'Missing (CEREBRAS_API_KEY)'}
                </strong>
              </span>
            </div>

            <span className="hidden text-slate-700 sm:inline" aria-hidden="true">
              /
            </span>

            <div className="flex items-center gap-2">
              {groqReady ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" aria-hidden="true" />
              )}
              <span className="text-slate-300">
                Groq API Key:{' '}
                <strong className={groqReady ? 'text-emerald-300' : 'text-amber-300'}>
                  {groqReady ? 'Configured on Server' : 'Missing (GROQ_API_KEY)'}
                </strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefreshConnection}
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-sky-300 transition-colors focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Verify Server Config</span>
          </button>
        </div>

        {backendConnected === true && !bothReady && (
          <div
            role="status"
            className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-100"
          >
            <strong className="font-semibold text-amber-200">Server API Key Notice:</strong>{' '}
            Add missing keys to your server environment (<code className="font-mono">CEREBRAS_API_KEY</code> and{' '}
            <code className="font-mono">GROQ_API_KEY</code> in <code className="font-mono">.env</code> or Secrets) and restart/verify. Keys are never stored or accessed in browser code.
          </div>
        )}
      </div>
    </section>
  );
}
