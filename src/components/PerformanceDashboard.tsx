import { Trophy } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ComparisonSummary, ProviderStreamState } from '../types/arena';

interface PerformanceDashboardProps {
  cerebrasState: ProviderStreamState;
  groqState: ProviderStreamState;
  latestSummary: ComparisonSummary | null;
}

function formatWinnerCallout(summary: ComparisonSummary | null): {
  headline: string;
  subline: string;
  tone: 'cerebras' | 'groq' | 'neutral';
} {
  if (!summary) {
    return {
      headline: 'Awaiting Completed Benchmark',
      subline: 'Run a live comparison to measure TTFT, total response time, and throughput.',
      tone: 'neutral',
    };
  }

  const cTotal = summary.cerebras?.totalTimeMs ?? null;
  const gTotal = summary.groq?.totalTimeMs ?? null;

  if (cTotal !== null && gTotal !== null) {
    if (summary.fasterByTotalTime === 'tie') {
      return {
        headline: 'TIED TOTAL RESPONSE TIME',
        subline: `Both configured providers completed within 1 ms (${cTotal.toFixed(0)} ms).`,
        tone: 'neutral',
      };
    }
    const winnerLabel = summary.fasterByTotalTime === 'cerebras' ? 'CEREBRAS' : 'GROQ';
    const diff = summary.totalTimeDifferenceMs ?? Math.abs(cTotal - gTotal);
    const ttftText =
      summary.fasterByTtft && summary.fasterByTtft !== 'tie' && summary.ttftDifferenceMs !== null
        ? `${summary.fasterByTtft.toUpperCase()} also reached first token ${Math.round(
            summary.ttftDifferenceMs
          )} ms faster.`
        : 'First-token latencies were nearly identical.';

    return {
      headline: `${winnerLabel} RESPONDED ${Math.round(diff)} ms FASTER`,
      subline: `Measured from request start to stream completion (${summary.cerebrasModel} vs ${summary.groqModel}). ${ttftText}`,
      tone: summary.fasterByTotalTime === 'cerebras' ? 'cerebras' : 'groq',
    };
  }

  if (cTotal !== null && gTotal === null) {
    return {
      headline: 'ONLY CEREBRAS COMPLETED',
      subline: 'Groq did not complete this run, so a head-to-head speed difference cannot be declared.',
      tone: 'neutral',
    };
  }

  if (gTotal !== null && cTotal === null) {
    return {
      headline: 'ONLY GROQ COMPLETED',
      subline: 'Cerebras did not complete this run, so a head-to-head speed difference cannot be declared.',
      tone: 'neutral',
    };
  }

  return {
    headline: 'NO COMPLETED MEASUREMENTS',
    subline: 'Neither provider completed successfully. Review the panel errors above and retry.',
    tone: 'neutral',
  };
}

interface ChartDatum {
  provider: string;
  value: number;
  fill: string;
}

function ComparisonBarCard({
  title,
  unit,
  data,
  emptyLabel,
}: {
  title: string;
  unit: string;
  data: ChartDatum[];
  emptyLabel: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-800/80 bg-[#0B1224]/80 p-5 backdrop-blur-md">
      <div className="flex items-baseline justify-between gap-2 mb-4">
        <h3 className="font-display text-sm font-semibold text-white">{title}</h3>
        <span className="font-mono text-xs text-slate-400">{unit}</span>
      </div>

      {data.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-xs text-slate-500">
          {emptyLabel}
        </div>
      ) : (
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis
                dataKey="provider"
                tick={{ fill: '#cbd5e1', fontSize: 12 }}
                axisLine={{ stroke: 'rgba(148,163,184,0.2)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(148,163,184,0.06)' }}
                contentStyle={{
                  backgroundColor: '#070C1A',
                  borderColor: 'rgba(51,65,85,0.9)',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
                formatter={(val: unknown) => [
                  `${Number(val).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`,
                  title,
                ]}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={68}>
                {data.map((entry) => (
                  <Cell key={entry.provider} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function PerformanceDashboard({
  cerebrasState,
  groqState,
  latestSummary,
}: PerformanceDashboardProps) {
  const cMetrics = cerebrasState.metrics;
  const gMetrics = groqState.metrics;

  const banner = formatWinnerCallout(latestSummary);

  const ttftData: ChartDatum[] = [];
  if (cMetrics?.ttftMs !== null && cMetrics?.ttftMs !== undefined) {
    ttftData.push({ provider: 'Cerebras', value: cMetrics.ttftMs, fill: '#38BDF8' });
  }
  if (gMetrics?.ttftMs !== null && gMetrics?.ttftMs !== undefined) {
    ttftData.push({ provider: 'Groq', value: gMetrics.ttftMs, fill: '#A78BFA' });
  }

  const totalTimeData: ChartDatum[] = [];
  if (cMetrics?.totalTimeMs !== undefined) {
    totalTimeData.push({ provider: 'Cerebras', value: cMetrics.totalTimeMs, fill: '#38BDF8' });
  }
  if (gMetrics?.totalTimeMs !== undefined) {
    totalTimeData.push({ provider: 'Groq', value: gMetrics.totalTimeMs, fill: '#A78BFA' });
  }

  const tpsData: ChartDatum[] = [];
  if (cMetrics?.tokensPerSecond !== null && cMetrics?.tokensPerSecond !== undefined) {
    tpsData.push({ provider: 'Cerebras', value: cMetrics.tokensPerSecond, fill: '#38BDF8' });
  }
  if (gMetrics?.tokensPerSecond !== null && gMetrics?.tokensPerSecond !== undefined) {
    tpsData.push({ provider: 'Groq', value: gMetrics.tokensPerSecond, fill: '#A78BFA' });
  }

  const cards = [
    {
      label: 'Cerebras TTFT',
      value:
        cMetrics?.ttftMs !== null && cMetrics?.ttftMs !== undefined
          ? `${cMetrics.ttftMs.toFixed(0)} ms`
          : '—',
      sub: 'Time to first token',
      accent: 'text-sky-300',
    },
    {
      label: 'Groq TTFT',
      value:
        gMetrics?.ttftMs !== null && gMetrics?.ttftMs !== undefined
          ? `${gMetrics.ttftMs.toFixed(0)} ms`
          : '—',
      sub: 'Time to first token',
      accent: 'text-violet-300',
    },
    {
      label: 'Cerebras Total Time',
      value:
        cMetrics !== null
          ? `${(cMetrics.totalTimeMs / 1000).toFixed(2)}s`
          : '—',
      sub: cMetrics !== null ? `${Math.round(cMetrics.totalTimeMs)} ms` : 'Awaiting run',
      accent: 'text-sky-300',
    },
    {
      label: 'Groq Total Time',
      value:
        gMetrics !== null
          ? `${(gMetrics.totalTimeMs / 1000).toFixed(2)}s`
          : '—',
      sub: gMetrics !== null ? `${Math.round(gMetrics.totalTimeMs)} ms` : 'Awaiting run',
      accent: 'text-violet-300',
    },
    {
      label: 'Cerebras Tokens / Sec',
      value:
        cMetrics?.tokensPerSecond !== null && cMetrics?.tokensPerSecond !== undefined
          ? `${cMetrics.tokensPerSecond.toFixed(1)}`
          : '—',
      sub:
        cMetrics?.throughputSource === 'estimated_tokens'
          ? 'Derived (estimated tokens)'
          : cMetrics?.throughputSource === 'measured_usage'
            ? 'Measured from provider usage'
            : 'Output tokens / gen time',
      accent: 'text-sky-300',
    },
    {
      label: 'Groq Tokens / Sec',
      value:
        gMetrics?.tokensPerSecond !== null && gMetrics?.tokensPerSecond !== undefined
          ? `${gMetrics.tokensPerSecond.toFixed(1)}`
          : '—',
      sub:
        gMetrics?.throughputSource === 'estimated_tokens'
          ? 'Derived (estimated tokens)'
          : gMetrics?.throughputSource === 'measured_usage'
            ? 'Measured from provider usage'
            : 'Output tokens / gen time',
      accent: 'text-violet-300',
    },
  ];

  return (
    <section id="metrics" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            Live Performance Telemetry
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Monotonic server-side measurements comparing first-token latency, total response duration, and token throughput.
          </p>
        </div>
      </div>

      {/* Dynamic Winner Callout */}
      <div
        className={`rounded-2xl border p-5 backdrop-blur-md ${
          banner.tone === 'cerebras'
            ? 'border-sky-500/40 bg-sky-500/10'
            : banner.tone === 'groq'
              ? 'border-violet-500/40 bg-violet-500/10'
              : 'border-slate-800/80 bg-[#0B1224]/80'
        }`}
      >
        <div className="flex items-start gap-3.5">
          <Trophy
            className={`mt-0.5 h-6 w-6 shrink-0 ${
              banner.tone === 'cerebras'
                ? 'text-sky-300'
                : banner.tone === 'groq'
                  ? 'text-violet-300'
                  : 'text-slate-400'
            }`}
            aria-hidden="true"
          />
          <div>
            <p className="font-display text-lg font-extrabold tracking-tight text-white sm:text-xl">
              {banner.headline}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-300 sm:text-sm">
              {banner.subline}
            </p>
          </div>
        </div>
      </div>

      {/* 6 Tabular Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-800/80 bg-[#0B1224]/80 p-4 backdrop-blur-md"
          >
            <div className="text-xs font-medium text-slate-400">{card.label}</div>
            <div className={`mt-2 font-mono text-2xl font-bold tabular-nums ${card.accent}`}>
              {card.value}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Recharts Comparison Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ComparisonBarCard
          title="Time to First Token (Lower is Faster)"
          unit="ms"
          data={ttftData}
          emptyLabel="TTFT measurements appear after completion."
        />
        <ComparisonBarCard
          title="Total Response Time (Lower is Faster)"
          unit="ms"
          data={totalTimeData}
          emptyLabel="Total duration appears after completion."
        />
        <ComparisonBarCard
          title="Output Throughput (Higher is Faster)"
          unit="tok/s"
          data={tpsData}
          emptyLabel="Throughput appears when token counts are available."
        />
      </div>
    </section>
  );
}
