import { Maximize2, Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  backendConnected: boolean | null;
  onEnterPresentation: () => void;
}

export function Header({ backendConnected, onEnterPresentation }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#050814]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Title + Subtitle */}
        <div className="min-w-0">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0">
              CEREBRAS
            </span>
            <span className="hidden text-xs font-medium tracking-wider text-sky-400 sm:inline whitespace-nowrap shrink-0">
              LIVE AI SPEED CHALLENGE
            </span>
          </div>
          <p className="hidden text-xs text-slate-400 md:block truncate">
            Two AI Systems. One Prompt. Real-Time Performance.
          </p>
        </div>

        {/* Zone 2: Single-line navigation links */}
        <nav
          aria-label="Primary sections"
          className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300"
        >
          <a
            href="#arena"
            className="whitespace-nowrap shrink-0 hover:text-sky-300 transition-colors"
          >
            Arena
          </a>
          <a
            href="#metrics"
            className="whitespace-nowrap shrink-0 hover:text-sky-300 transition-colors"
          >
            Metrics
          </a>
          <a
            href="#audience"
            className="whitespace-nowrap shrink-0 hover:text-sky-300 transition-colors"
          >
            Audience
          </a>
          <a
            href="#multi-round"
            className="whitespace-nowrap shrink-0 hover:text-sky-300 transition-colors"
          >
            Multi-Round
          </a>
        </nav>

        {/* Zone 3: Real Backend Connection Status + Primary Presentation CTA */}
        <div className="flex items-center gap-4 shrink-0">
          <div
            className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0"
            aria-live="polite"
            title="Live backend connection status from /api/health"
          >
            {backendConnected === true ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                <span className="text-emerald-300">Backend Connected</span>
              </>
            ) : backendConnected === false ? (
              <>
                <WifiOff className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
                <span className="text-rose-300">Backend Offline</span>
              </>
            ) : (
              <span className="text-slate-400">Checking Backend...</span>
            )}
          </div>

          <button
            type="button"
            onClick={onEnterPresentation}
            className="inline-flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/15 px-3.5 py-2 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-500/25 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 whitespace-nowrap shrink-0"
          >
            <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Presentation Mode</span>
          </button>
        </div>
      </div>
    </header>
  );
}
