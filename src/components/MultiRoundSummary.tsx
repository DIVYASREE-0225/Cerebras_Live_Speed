import type { MultiRoundRecord } from '../types/arena';

interface MultiRoundSummaryProps {
  records: MultiRoundRecord[];
  targetRounds: number;
  isRunning: boolean;
  currentRoundIndex: number;
}

function avgValid(values: Array<number | null | undefined>): number | null {
  const valid = values.filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v)
  );
  if (valid.length === 0) return null;
  return valid.reduce((acc, n) => acc + n, 0) / valid.length;
}

export function MultiRoundSummary({
  records,
  targetRounds,
  isRunning,
  currentRoundIndex,
}: MultiRoundSummaryProps) {
  if (targetRounds <= 1 && records.length === 0) {
    return (
      <section
        id="multi-round"
        className="rounded-2xl border border-slate-800/80 bg-[#0B1224]/70 p-6 backdrop-blur-md"
      >
        <h2 className="font-display text-xl font-bold tracking-tight text-white">
          Multi-Round Benchmark Summary
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Select <strong className="text-slate-200">3 Rounds</strong> or{' '}
          <strong className="text-slate-200">5 Rounds</strong> in the challenge controls above to
          measure average TTFT, average total response time, and average throughput across
          repeated runs. Failed rounds are excluded from averages rather than counted as zero.
        </p>
      </section>
    );
  }

  const cAvgTtft = avgValid(records.map((r) => r.summary.cerebras?.ttftMs));
  const gAvgTtft = avgValid(records.map((r) => r.summary.groq?.ttftMs));

  const cAvgTotal = avgValid(records.map((r) => r.summary.cerebras?.totalTimeMs));
  const gAvgTotal = avgValid(records.map((r) => r.summary.groq?.totalTimeMs));

  const cAvgTps = avgValid(records.map((r) => r.summary.cerebras?.tokensPerSecond));
  const gAvgTps = avgValid(records.map((r) => r.summary.groq?.tokensPerSecond));

  const cValidCount = records.filter((r) => r.summary.cerebras !== null).length;
  const gValidCount = records.filter((r) => r.summary.groq !== null).length;

  let overallSummaryText = 'Multi-round run in progress...';
  if (!isRunning && records.length > 0) {
    if (cAvgTotal !== null && gAvgTotal !== null) {
      const diff = Math.abs(cAvgTotal - gAvgTotal);
      if (diff < 1) {
        overallSummaryText = `Across ${records.length} rounds, both configured providers averaged virtually identical total response times (${cAvgTotal.toFixed(0)} ms).`;
      } else if (cAvgTotal < gAvgTotal) {
        overallSummaryText = `Across ${cValidCount} completed Cerebras rounds and ${gValidCount} completed Groq rounds, Cerebras averaged ${Math.round(
          diff
        )} ms faster total response time.`;
      } else {
        overallSummaryText = `Across ${gValidCount} completed Groq rounds and ${cValidCount} completed Cerebras rounds, Groq averaged ${Math.round(
          diff
        )} ms faster total response time.`;
      }
    } else {
      overallSummaryText = `Completed ${records.length} rounds. Averages reflect only valid non-failed runs per provider.`;
    }
  }

  return (
    <section
      id="multi-round"
      className="rounded-2xl border border-slate-800/80 bg-[#0B1224]/85 p-6 backdrop-blur-md"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            Multi-Round Benchmark ({records.length}/{targetRounds} Rounds)
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            {isRunning
              ? `Running round ${currentRoundIndex} of ${targetRounds}...`
              : overallSummaryText}
          </p>
        </div>
      </div>

      {/* Averages Grid */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-[#070C1B] p-4">
          <div className="text-xs text-slate-400">Average TTFT</div>
          <div className="mt-2 flex items-baseline justify-between font-mono text-sm tabular-nums">
            <span className="text-sky-300">
              Cerebras: {cAvgTtft !== null ? `${cAvgTtft.toFixed(1)} ms` : 'N/A'}
            </span>
            <span className="text-violet-300">
              Groq: {gAvgTtft !== null ? `${gAvgTtft.toFixed(1)} ms` : 'N/A'}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#070C1B] p-4">
          <div className="text-xs text-slate-400">Average Total Time</div>
          <div className="mt-2 flex items-baseline justify-between font-mono text-sm tabular-nums">
            <span className="text-sky-300">
              Cerebras: {cAvgTotal !== null ? `${cAvgTotal.toFixed(0)} ms` : 'N/A'}
            </span>
            <span className="text-violet-300">
              Groq: {gAvgTotal !== null ? `${gAvgTotal.toFixed(0)} ms` : 'N/A'}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#070C1B] p-4">
          <div className="text-xs text-slate-400">Average Throughput</div>
          <div className="mt-2 flex items-baseline justify-between font-mono text-sm tabular-nums">
            <span className="text-sky-300">
              Cerebras: {cAvgTps !== null ? `${cAvgTps.toFixed(1)} tok/s` : 'N/A'}
            </span>
            <span className="text-violet-300">
              Groq: {gAvgTps !== null ? `${gAvgTps.toFixed(1)} tok/s` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Round Table */}
      {records.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 pr-4 font-medium">Round</th>
                <th className="py-2.5 px-4 font-medium text-right">Cerebras TTFT</th>
                <th className="py-2.5 px-4 font-medium text-right">Groq TTFT</th>
                <th className="py-2.5 px-4 font-medium text-right">Cerebras Total</th>
                <th className="py-2.5 px-4 font-medium text-right">Groq Total</th>
                <th className="py-2.5 pl-4 font-medium text-right">Faster Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
              {records.map(({ round, summary }) => (
                <tr key={summary.comparisonId} className="hover:bg-slate-900/40">
                  <td className="py-2.5 pr-4 font-sans font-semibold text-slate-200">
                    Round {round}
                  </td>
                  <td className="py-2.5 px-4 text-right text-sky-300">
                    {summary.cerebras?.ttftMs !== null && summary.cerebras?.ttftMs !== undefined
                      ? `${summary.cerebras.ttftMs.toFixed(0)} ms`
                      : summary.cerebrasError
                        ? 'Failed'
                        : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right text-violet-300">
                    {summary.groq?.ttftMs !== null && summary.groq?.ttftMs !== undefined
                      ? `${summary.groq.ttftMs.toFixed(0)} ms`
                      : summary.groqError
                        ? 'Failed'
                        : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right text-sky-200">
                    {summary.cerebras
                      ? `${summary.cerebras.totalTimeMs.toFixed(0)} ms`
                      : summary.cerebrasError
                        ? 'Failed'
                        : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right text-violet-200">
                    {summary.groq
                      ? `${summary.groq.totalTimeMs.toFixed(0)} ms`
                      : summary.groqError
                        ? 'Failed'
                        : '—'}
                  </td>
                  <td className="py-2.5 pl-4 text-right font-sans font-semibold">
                    {summary.fasterByTotalTime === 'cerebras' ? (
                      <span className="text-sky-300">
                        Cerebras (-{Math.round(summary.totalTimeDifferenceMs ?? 0)} ms)
                      </span>
                    ) : summary.fasterByTotalTime === 'groq' ? (
                      <span className="text-violet-300">
                        Groq (-{Math.round(summary.totalTimeDifferenceMs ?? 0)} ms)
                      </span>
                    ) : summary.fasterByTotalTime === 'tie' ? (
                      <span className="text-slate-300">Tie</span>
                    ) : (
                      <span className="text-slate-500">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
