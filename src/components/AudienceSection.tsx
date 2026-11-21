import { CheckCircle2, RotateCcw, Users, XCircle } from 'lucide-react';
import type { ComparisonSummary, VoteStats } from '../types/arena';

interface AudienceSectionProps {
  latestSummary: ComparisonSummary | null;
  votes: VoteStats;
  hasVotedThisRound: boolean;
  isVoting: boolean;
  onVote: (option: 'cerebras' | 'groq' | 'equal') => void;
  onResetVotes: () => void;
}

export function AudienceSection({
  latestSummary,
  votes,
  hasVotedThisRound,
  isVoting,
  onVote,
  onResetVotes,
}: AudienceSectionProps) {
  const showPredictionOutcome =
    latestSummary !== null &&
    latestSummary.prediction !== null &&
    latestSummary.predictionCorrect !== null;

  return (
    <section
      id="audience"
      className="rounded-2xl border border-slate-800/80 bg-[#0B1224]/80 p-6 backdrop-blur-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-sky-400">
            <Users className="h-4 w-4" aria-hidden="true" />
            <span>Live Audience Participation</span>
          </div>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-white">
            WHICH ANSWER WAS MORE USEFUL?
          </h2>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Speed metrics and answer usefulness are tracked independently. {votes.persistenceNote}.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-400">Total Session Votes</div>
            <div className="font-mono text-2xl font-bold tabular-nums text-white">
              {votes.totalVotes.toLocaleString()}
            </div>
          </div>

          {votes.totalVotes > 0 && (
            <button
              type="button"
              onClick={onResetVotes}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-400 hover:border-slate-700 hover:text-slate-200"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reset Votes</span>
            </button>
          )}
        </div>
      </div>

      {/* Prediction Outcome Feedback */}
      {showPredictionOutcome && (
        <div
          className={`mt-5 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
            latestSummary.predictionCorrect
              ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-100'
              : 'border-amber-500/35 bg-amber-500/10 text-amber-100'
          }`}
        >
          {latestSummary.predictionCorrect ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
          )}
          <div>
            <span className="font-semibold">
              Pre-Run Prediction ({latestSummary.prediction === 'cerebras' ? 'Cerebras' : 'Groq'}):{' '}
              {latestSummary.predictionCorrect ? 'Correct!' : 'Missed!'}
            </span>{' '}
            <span className="text-xs opacity-90">
              {latestSummary.fasterByTtft && latestSummary.fasterByTtft !== 'tie'
                ? `${latestSummary.fasterByTtft === 'cerebras' ? 'Cerebras' : 'Groq'} delivered the first token first.`
                : ''}
            </span>
          </div>
        </div>
      )}

      {/* Voting Buttons */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          disabled={isVoting}
          onClick={() => onVote('cerebras')}
          className="flex items-center justify-between rounded-xl border border-sky-500/35 bg-sky-500/10 px-4 py-3.5 text-left transition-colors hover:bg-sky-500/20 disabled:opacity-50"
        >
          <div>
            <div className="font-display text-sm font-bold text-white">Cerebras</div>
            <div className="text-xs text-sky-300">More useful answer</div>
          </div>
          <span className="font-mono text-lg font-bold tabular-nums text-sky-300">
            {votes.cerebrasPercent.toFixed(1)}%
          </span>
        </button>

        <button
          type="button"
          disabled={isVoting}
          onClick={() => onVote('groq')}
          className="flex items-center justify-between rounded-xl border border-violet-500/35 bg-violet-500/10 px-4 py-3.5 text-left transition-colors hover:bg-violet-500/20 disabled:opacity-50"
        >
          <div>
            <div className="font-display text-sm font-bold text-white">Groq</div>
            <div className="text-xs text-violet-300">More useful answer</div>
          </div>
          <span className="font-mono text-lg font-bold tabular-nums text-violet-300">
            {votes.groqPercent.toFixed(1)}%
          </span>
        </button>

        <button
          type="button"
          disabled={isVoting}
          onClick={() => onVote('equal')}
          className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-3.5 text-left transition-colors hover:bg-slate-800/70 disabled:opacity-50"
        >
          <div>
            <div className="font-display text-sm font-bold text-white">Both equally useful</div>
            <div className="text-xs text-slate-400">Tie in answer quality</div>
          </div>
          <span className="font-mono text-lg font-bold tabular-nums text-slate-200">
            {votes.equalPercent.toFixed(1)}%
          </span>
        </button>
      </div>

      {hasVotedThisRound && (
        <p className="mt-3 text-xs text-emerald-300">
          Vote recorded in session totals. Audience members can continue casting votes below.
        </p>
      )}

      {/* Vote Distribution Bars */}
      <div className="mt-6 space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-300">Cerebras</span>
            <span className="font-mono tabular-nums text-sky-300">
              {votes.cerebras} votes ({votes.cerebrasPercent.toFixed(1)}%)
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-900">
            <div
              className="h-full bg-sky-400 transition-all duration-300"
              style={{ width: `${votes.cerebrasPercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-300">Groq</span>
            <span className="font-mono tabular-nums text-violet-300">
              {votes.groq} votes ({votes.groqPercent.toFixed(1)}%)
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-900">
            <div
              className="h-full bg-violet-400 transition-all duration-300"
              style={{ width: `${votes.groqPercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-300">Both equally useful</span>
            <span className="font-mono tabular-nums text-slate-300">
              {votes.equal} votes ({votes.equalPercent.toFixed(1)}%)
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-900">
            <div
              className="h-full bg-slate-400 transition-all duration-300"
              style={{ width: `${votes.equalPercent}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
