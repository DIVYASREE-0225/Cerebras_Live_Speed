import { Minimize2, Play, Trophy } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type {
  ComparisonSummary,
  ProviderStreamState,
  VoteStats,
} from '../types/arena';
import { ProviderPanel } from './ProviderPanel';

interface PresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  cerebrasState: ProviderStreamState;
  groqState: ProviderStreamState;
  latestSummary: ComparisonSummary | null;
  votes: VoteStats;
  isRunning: boolean;
  onRunAgain: () => void;
}

export function PresentationModal({
  isOpen,
  onClose,
  prompt,
  cerebrasState,
  groqState,
  latestSummary,
  votes,
  isRunning,
  onRunAgain,
}: PresentationModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const el = containerRef.current;
    if (el && el.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => {
        // Ignore if browser blocks fullscreen without direct gesture or inside iframe
      });
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const fasterCallout = (() => {
    if (!latestSummary) return null;
    if (
      latestSummary.fasterByTotalTime === 'cerebras' &&
      latestSummary.totalTimeDifferenceMs !== null
    ) {
      return `CEREBRAS RESPONDED ${Math.round(latestSummary.totalTimeDifferenceMs)} ms FASTER`;
    }
    if (
      latestSummary.fasterByTotalTime === 'groq' &&
      latestSummary.totalTimeDifferenceMs !== null
    ) {
      return `GROQ RESPONDED ${Math.round(latestSummary.totalTimeDifferenceMs)} ms FASTER`;
    }
    if (latestSummary.fasterByTotalTime === 'tie') {
      return 'TIED TOTAL RESPONSE TIME';
    }
    return null;
  })();

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Event Presentation Mode"
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[#050814] arena-grid-bg p-6 sm:p-8"
    >
      {/* Presentation Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="font-display text-xl font-extrabold tracking-tight text-white sm:text-2xl">
            CEREBRAS — LIVE AI SPEED CHALLENGE
          </div>
          <p className="text-xs text-sky-300 sm:text-sm">
            Two AI Systems. One Prompt. Real-Time Performance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isRunning || prompt.trim().length === 0}
            onClick={onRunAgain}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-sky-400 disabled:opacity-40"
          >
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            <span>{isRunning ? 'Streaming Live...' : 'Run Challenge'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:text-white"
          >
            <Minimize2 className="h-4 w-4" aria-hidden="true" />
            <span>Exit Stage View</span>
          </button>
        </div>
      </div>

      {/* Prominent Prompt Banner */}
      <div className="mt-5 rounded-2xl border border-slate-800 bg-[#0B1224]/90 px-6 py-4">
        <div className="text-xs font-semibold tracking-wider text-sky-400">
          LIVE CHALLENGE PROMPT
        </div>
        <p className="mt-1 font-display text-lg font-semibold text-white sm:text-2xl">
          {prompt.trim() || 'No prompt entered yet. Exit stage view to enter a prompt.'}
        </p>
      </div>

      {/* Winner Callout Banner */}
      {fasterCallout && (
        <div className="mt-4 flex items-center justify-center gap-3 rounded-2xl border border-sky-500/40 bg-sky-500/15 px-6 py-3.5 text-center">
          <Trophy className="h-6 w-6 text-sky-300 shrink-0" aria-hidden="true" />
          <span className="font-display text-xl font-extrabold tracking-tight text-white sm:text-2xl">
            {fasterCallout}
          </span>
        </div>
      )}

      {/* Side-by-Side Oversized Panels */}
      <div className="mt-5 grid flex-1 grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
        <ProviderPanel
          provider="cerebras"
          state={cerebrasState}
          isFasterTtft={latestSummary?.fasterByTtft === 'cerebras'}
          isFasterTotal={latestSummary?.fasterByTotalTime === 'cerebras'}
          onClear={() => {}}
          presentationMode
        />
        <ProviderPanel
          provider="groq"
          state={groqState}
          isFasterTtft={latestSummary?.fasterByTtft === 'groq'}
          isFasterTotal={latestSummary?.fasterByTotalTime === 'groq'}
          onClear={() => {}}
          presentationMode
        />
      </div>

      {/* Stage Audience Tally */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-[#0B1224]/90 px-6 py-4 text-sm">
        <div className="font-display font-bold text-white">
          Audience Votes ({votes.totalVotes.toLocaleString()} total)
        </div>
        <div className="flex flex-wrap items-center gap-6 font-mono tabular-nums">
          <span className="text-sky-300">
            Cerebras: {votes.cerebrasPercent.toFixed(1)}% ({votes.cerebras})
          </span>
          <span className="text-violet-300">
            Groq: {votes.groqPercent.toFixed(1)}% ({votes.groq})
          </span>
          <span className="text-slate-300">
            Equal: {votes.equalPercent.toFixed(1)}% ({votes.equal})
          </span>
          {latestSummary?.prediction && latestSummary.predictionCorrect !== null && (
            <span className="text-emerald-300">
              Pre-run Pick ({latestSummary.prediction.toUpperCase()}):{' '}
              {latestSummary.predictionCorrect ? 'CORRECT' : 'MISSED'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
