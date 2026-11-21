import { Check, Copy, Eraser, RefreshCw, AlertCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ProviderId, ProviderStatus, ProviderStreamState } from '../types/arena';

interface ProviderPanelProps {
  provider: ProviderId;
  state: ProviderStreamState;
  isFasterTtft?: boolean;
  isFasterTotal?: boolean;
  onClear: () => void;
  onRetry?: () => void;
  canRetry?: boolean;
  presentationMode?: boolean;
}

function getStatusLabel(status: ProviderStatus): { text: string; colorClass: string } {
  switch (status) {
    case 'waiting':
      return { text: 'Waiting', colorClass: 'text-slate-400' };
    case 'connecting':
      return { text: 'Connecting', colorClass: 'text-amber-300' };
    case 'generating':
      return { text: 'Generating', colorClass: 'text-sky-300' };
    case 'completed':
      return { text: 'Completed', colorClass: 'text-emerald-300' };
    case 'failed':
      return { text: 'Failed', colorClass: 'text-rose-300' };
  }
}

export function ProviderPanel({
  provider,
  state,
  isFasterTtft = false,
  isFasterTotal = false,
  onClear,
  onRetry,
  canRetry = false,
  presentationMode = false,
}: ProviderPanelProps) {
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const isCerebras = provider === 'cerebras';
  const title = isCerebras ? 'CEREBRAS' : 'GROQ — BASELINE';
  const accentText = isCerebras ? 'text-sky-300' : 'text-violet-300';
  const borderAccent = isCerebras
    ? 'border-sky-500/30 hover:border-sky-500/45'
    : 'border-violet-500/30 hover:border-violet-500/45';

  const statusMeta = getStatusLabel(state.status);

  useEffect(() => {
    if (state.status === 'generating' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.content, state.reasoning, state.status]);

  const handleCopy = async () => {
    const textToCopy = state.content || state.reasoning;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked in restricted context
    }
  };

  const displayTotalMs = state.metrics?.totalTimeMs ?? state.liveElapsedMs;
  const displayTtftMs = state.metrics?.ttftMs ?? state.ttftMs;

  return (
    <article
      className={`flex h-full flex-col rounded-2xl border bg-[#0B1224]/85 backdrop-blur-md transition-colors ${borderAccent}`}
    >
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Clean geometric brand mark */}
          <div
            aria-hidden="true"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border font-display text-sm font-extrabold ${
              isCerebras
                ? 'border-sky-500/40 bg-sky-500/15 text-sky-300'
                : 'border-violet-500/40 bg-violet-500/15 text-violet-300'
            }`}
          >
            {isCerebras ? 'C' : 'G'}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h2 className="font-display text-base font-bold tracking-tight text-white">
                {title}
              </h2>
              {(isFasterTtft || isFasterTotal) && state.status === 'completed' && (
                <span
                  className={`text-xs font-semibold ${accentText}`}
                >
                  · {isFasterTotal ? 'Fastest Total' : 'First Token'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
              <span className="font-mono truncate">{state.model}</span>
              <span aria-hidden="true">·</span>
              <span className={`inline-flex items-center gap-1.5 font-medium ${statusMeta.colorClass}`}>
                {(state.status === 'connecting' || state.status === 'generating') && (
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      isCerebras ? 'bg-sky-400' : 'bg-violet-400'
                    }`}
                  />
                )}
                {statusMeta.text}
              </span>
            </div>
          </div>
        </div>

        {/* Panel Actions */}
        {!presentationMode && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!state.content && !state.reasoning}
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:text-white disabled:opacity-40"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={
                state.status === 'connecting' ||
                state.status === 'generating' ||
                (state.status === 'waiting' && !state.content && !state.error)
              }
              onClick={onClear}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-700 hover:text-white disabled:opacity-40"
            >
              <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Clear</span>
            </button>
          </div>
        )}
      </div>

      {/* Live Metrics Strip */}
      <div className="grid grid-cols-2 gap-3 border-b border-slate-800/70 bg-[#070C1B]/70 px-5 py-3 sm:grid-cols-4">
        <div>
          <div className="text-[11px] font-medium text-slate-400">TTFT</div>
          <div
            className={`mt-0.5 font-mono font-semibold tabular-nums ${
              presentationMode ? 'text-lg' : 'text-sm'
            } ${displayTtftMs !== null ? 'text-white' : 'text-slate-500'}`}
          >
            {displayTtftMs !== null ? `${displayTtftMs.toFixed(0)} ms` : '—'}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-medium text-slate-400">Total Time</div>
          <div
            className={`mt-0.5 font-mono font-semibold tabular-nums ${
              presentationMode ? 'text-lg' : 'text-sm'
            } ${displayTotalMs !== null ? 'text-white' : 'text-slate-500'}`}
          >
            {displayTotalMs !== null
              ? `${(displayTotalMs / 1000).toFixed(2)}s (${Math.round(displayTotalMs)} ms)`
              : '—'}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-medium text-slate-400">
            Output Tokens
            {state.metrics?.tokenCountSource === 'estimated_tiktoken' ? ' (Est.)' : ''}
          </div>
          <div
            className={`mt-0.5 font-mono font-semibold tabular-nums ${
              presentationMode ? 'text-lg' : 'text-sm'
            } ${
              state.metrics?.outputTokens !== null && state.metrics?.outputTokens !== undefined
                ? 'text-white'
                : 'text-slate-500'
            }`}
          >
            {state.metrics
              ? state.metrics.outputTokens !== null
                ? state.metrics.outputTokens.toLocaleString()
                : 'Not available'
              : '—'}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-medium text-slate-400">
            Tokens / Sec
            {state.metrics?.throughputSource === 'estimated_tokens' ? ' (Est.)' : ''}
          </div>
          <div
            className={`mt-0.5 font-mono font-semibold tabular-nums ${
              presentationMode ? 'text-lg' : 'text-sm'
            } ${
              state.metrics?.tokensPerSecond !== null &&
              state.metrics?.tokensPerSecond !== undefined
                ? accentText
                : 'text-slate-500'
            }`}
          >
            {state.metrics
              ? state.metrics.tokensPerSecond !== null
                ? `${state.metrics.tokensPerSecond.toFixed(1)} tok/s`
                : 'N/A'
              : '—'}
          </div>
        </div>
      </div>

      {/* Streaming Response Body */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto px-5 py-4 ${
          presentationMode ? 'min-h-[300px] max-h-[420px]' : 'min-h-[280px] max-h-[460px]'
        }`}
      >
        {state.status === 'failed' && state.error ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-4 text-sm text-rose-100"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
              <div className="space-y-2">
                <p className="font-semibold text-rose-200">Provider Request Failed</p>
                <p className="text-xs leading-relaxed text-rose-100/90">{state.error}</p>
                {canRetry && onRetry && !presentationMode && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/40 bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-500/30"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Retry Comparison</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : state.status === 'waiting' && !state.content && !state.reasoning ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center text-slate-500">
            <p className="text-sm font-medium text-slate-400">Ready for live challenge</p>
            <p className="mt-1 max-w-xs text-xs text-slate-500">
              Enter a prompt above and click RUN COMPARISON to stream real-time tokens from{' '}
              {isCerebras ? 'Cerebras' : 'Groq'}.
            </p>
          </div>
        ) : state.status === 'connecting' && !state.content && !state.reasoning ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center">
            <div
              className={`h-6 w-6 animate-spin rounded-full border-2 border-t-transparent ${
                isCerebras ? 'border-sky-400' : 'border-violet-400'
              }`}
              aria-hidden="true"
            />
            <p className="mt-3 text-xs font-medium text-slate-300">
              Connecting to {isCerebras ? 'Cerebras Inference' : 'Groq API'}...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {state.reasoning && (
              <details
                open={!state.content}
                className="rounded-xl border border-slate-800/80 bg-slate-900/50 px-3.5 py-2.5 text-xs text-slate-400"
              >
                <summary className="cursor-pointer font-medium text-slate-300 select-none">
                  Model Reasoning Trace
                </summary>
                <div className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-400">
                  {state.reasoning}
                </div>
              </details>
            )}

            {state.content && (
              <div
                className={`whitespace-pre-wrap leading-relaxed text-slate-100 ${
                  presentationMode ? 'text-base sm:text-lg' : 'text-sm sm:text-[15px]'
                }`}
              >
                {state.content}
                {state.status === 'generating' && (
                  <span
                    aria-hidden="true"
                    className={`ml-0.5 inline-block h-4 w-1.5 align-middle ${
                      isCerebras ? 'bg-sky-400' : 'bg-violet-400'
                    }`}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
