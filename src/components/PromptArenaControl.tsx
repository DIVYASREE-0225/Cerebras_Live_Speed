import { Play, Repeat, RotateCcw, Square, Trash2 } from 'lucide-react';
import type { ModelsResponse, ProviderId } from '../types/arena';

const EXAMPLE_PROMPTS = [
  'Explain quantum computing in simple words.',
  'Write a Python program to find prime numbers.',
  'Explain how artificial intelligence works.',
  'Write a creative story about the future of technology.',
  'Explain blockchain with a real-world example.',
];

interface PromptArenaControlProps {
  prompt: string;
  onPromptChange: (val: string) => void;
  cerebrasModel: string;
  onCerebrasModelChange: (val: string) => void;
  groqModel: string;
  onGroqModelChange: (val: string) => void;
  maxTokens: number;
  onMaxTokensChange: (val: number) => void;
  temperature: number;
  onTemperatureChange: (val: number) => void;
  prediction: ProviderId | null;
  onPredictionChange: (val: ProviderId | null) => void;
  modelsCatalog: ModelsResponse | null;
  isRunning: boolean;
  multiRoundTarget: number;
  currentRoundIndex: number;
  onRunComparison: (rounds?: number) => void;
  onStopComparison: () => void;
  onResetArena: () => void;
}

function normalizeModelName(id: string): string {
  const parts = id.toLowerCase().split('/');
  return parts[parts.length - 1].replace(/[^a-z0-9]/g, '');
}

export function PromptArenaControl({
  prompt,
  onPromptChange,
  cerebrasModel,
  onCerebrasModelChange,
  groqModel,
  onGroqModelChange,
  maxTokens,
  onMaxTokensChange,
  temperature,
  onTemperatureChange,
  prediction,
  onPredictionChange,
  modelsCatalog,
  isRunning,
  multiRoundTarget,
  currentRoundIndex,
  onRunComparison,
  onStopComparison,
  onResetArena,
}: PromptArenaControlProps) {
  const trimmedPrompt = prompt.trim();
  const isPromptEmpty = trimmedPrompt.length === 0;
  const sameBaseModel = normalizeModelName(cerebrasModel) === normalizeModelName(groqModel);

  const cerebrasOptions = modelsCatalog?.models.cerebras ?? [
    { id: cerebrasModel, name: cerebrasModel, ownedBy: 'Cerebras' },
  ];
  const groqOptions = modelsCatalog?.models.groq ?? [
    { id: groqModel, name: groqModel, ownedBy: 'Groq' },
  ];

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-[#0B1224]/80 p-5 backdrop-blur-md sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label
          htmlFor="challenge-prompt-input"
          className="text-sm font-semibold text-white"
        >
          Challenge Prompt
        </label>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="font-mono tabular-nums">
            {prompt.length.toLocaleString()} / 16,000 chars
          </span>
          {prompt.length > 0 && !isRunning && (
            <button
              type="button"
              onClick={() => onPromptChange('')}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Clear prompt</span>
            </button>
          )}
        </div>
      </div>

      <textarea
        id="challenge-prompt-input"
        rows={4}
        value={prompt}
        disabled={isRunning}
        maxLength={16000}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder="Enter your AI challenge prompt here..."
        className="mt-2.5 w-full resize-y rounded-xl border border-slate-700/80 bg-[#060B18] px-4 py-3 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none disabled:opacity-60 sm:text-base"
      />

      {/* Example prompt suggestions */}
      <div className="mt-3">
        <span className="block text-xs font-medium text-slate-400 mb-2">
          Example Prompts
        </span>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example}
              type="button"
              disabled={isRunning}
              onClick={() => onPromptChange(example)}
              className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-left text-xs text-slate-300 transition-colors hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-200 disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Fair Comparison Parameters + Model Selectors */}
      <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-800/80 pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label
            htmlFor="cerebras-model-select"
            className="block text-xs font-medium text-sky-300 mb-1.5"
          >
            Cerebras Model
          </label>
          <select
            id="cerebras-model-select"
            value={cerebrasModel}
            disabled={isRunning}
            onChange={(e) => onCerebrasModelChange(e.target.value)}
            className="w-full rounded-lg border border-slate-700/80 bg-[#060B18] px-3 py-2 font-mono text-xs text-slate-100 focus:border-sky-500 focus:outline-none disabled:opacity-60"
          >
            {cerebrasOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="groq-model-select"
            className="block text-xs font-medium text-violet-300 mb-1.5"
          >
            Groq Baseline Model
          </label>
          <select
            id="groq-model-select"
            value={groqModel}
            disabled={isRunning}
            onChange={(e) => onGroqModelChange(e.target.value)}
            className="w-full rounded-lg border border-slate-700/80 bg-[#060B18] px-3 py-2 font-mono text-xs text-slate-100 focus:border-violet-500 focus:outline-none disabled:opacity-60"
          >
            {groqOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="max-tokens-select"
            className="block text-xs font-medium text-slate-300 mb-1.5"
          >
            Max Output Tokens (Both)
          </label>
          <select
            id="max-tokens-select"
            value={maxTokens}
            disabled={isRunning}
            onChange={(e) => onMaxTokensChange(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-700/80 bg-[#060B18] px-3 py-2 font-mono text-xs tabular-nums text-slate-100 focus:border-sky-500 focus:outline-none disabled:opacity-60"
          >
            <option value={256}>256 tokens</option>
            <option value={512}>512 tokens</option>
            <option value={1024}>1,024 tokens</option>
            <option value={2048}>2,048 tokens</option>
            <option value={4096}>4,096 tokens</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="temperature-input"
            className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1.5"
          >
            <span>Temperature (Both)</span>
            <span className="font-mono tabular-nums text-sky-300">{temperature.toFixed(1)}</span>
          </label>
          <input
            id="temperature-input"
            type="range"
            min={0}
            max={1.5}
            step={0.1}
            value={temperature}
            disabled={isRunning}
            onChange={(e) => onTemperatureChange(Number(e.target.value))}
            className="mt-1.5 w-full accent-sky-400"
          />
        </div>
      </div>

      {/* Fair Comparison Notice */}
      <p className="mt-3 text-xs text-slate-400">
        {sameBaseModel ? (
          <>
            Fair configuration active: both providers are configured with matching base model{' '}
            <span className="font-mono text-slate-200">{cerebrasModel}</span> and identical prompt,
            temperature, and token limits.
          </>
        ) : (
          <>
            Different models selected (<span className="font-mono text-sky-300">{cerebrasModel}</span>{' '}
            vs <span className="font-mono text-violet-300">{groqModel}</span>): this benchmark
            measures each complete provider-and-model configuration under identical prompt and
            generation settings.
          </>
        )}
      </p>

      {/* Audience Pre-Run Prediction + Action Controls */}
      <div className="mt-5 flex flex-col gap-4 border-t border-slate-800/80 pt-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold tracking-wide text-slate-300">
            WHO WILL RESPOND FIRST?
          </span>
          <div
            role="group"
            aria-label="Audience prediction"
            className="inline-flex rounded-lg border border-slate-800 bg-[#060B18] p-1"
          >
            <button
              type="button"
              disabled={isRunning}
              onClick={() =>
                onPredictionChange(prediction === 'cerebras' ? null : 'cerebras')
              }
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                prediction === 'cerebras'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Cerebras
            </button>
            <button
              type="button"
              disabled={isRunning}
              onClick={() => onPredictionChange(prediction === 'groq' ? null : 'groq')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                prediction === 'groq'
                  ? 'bg-violet-500 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Groq
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isRunning ? (
            <button
              type="button"
              onClick={onStopComparison}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/20 px-5 py-2.5 text-sm font-semibold text-rose-100 transition-colors hover:bg-rose-500/30 whitespace-nowrap"
            >
              <Square className="h-4 w-4 fill-current" aria-hidden="true" />
              <span>
                {multiRoundTarget > 1
                  ? `Stop Round ${currentRoundIndex}/${multiRoundTarget}`
                  : 'Stop Stream'}
              </span>
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={isPromptEmpty}
                onClick={() => onRunComparison(1)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-6 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                <span>RUN COMPARISON</span>
              </button>

              <button
                type="button"
                disabled={isPromptEmpty}
                onClick={() => onRunComparison(3)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:border-sky-500/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap"
              >
                <Repeat className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                <span>3 Rounds</span>
              </button>

              <button
                type="button"
                disabled={isPromptEmpty}
                onClick={() => onRunComparison(5)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:border-sky-500/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap"
              >
                <Repeat className="h-3.5 w-3.5 text-violet-400" aria-hidden="true" />
                <span>5 Rounds</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onResetArena}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-transparent px-3.5 py-2.5 text-xs font-medium text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-200 whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
}
