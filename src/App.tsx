import { useState } from 'react';
import { AudienceSection } from './components/AudienceSection';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { MultiRoundSummary } from './components/MultiRoundSummary';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { PresentationModal } from './components/PresentationModal';
import { PromptArenaControl } from './components/PromptArenaControl';
import { ProviderPanel } from './components/ProviderPanel';
import { useComparisonArena } from './hooks/useComparisonArena';

export default function App() {
  const [presentationOpen, setPresentationOpen] = useState(false);

  const arena = useComparisonArena();

  return (
    <div className="min-h-screen bg-[#050814] arena-grid-bg text-slate-100">
      <Header
        backendConnected={arena.backendConnected}
        onEnterPresentation={() => setPresentationOpen(true)}
      />

      <main>
        <HeroSection
          health={arena.health}
          backendConnected={arena.backendConnected}
          onRefreshConnection={arena.refreshConnection}
        />

        <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
          {/* Prompt Input & Fair Comparison Controls */}
          <section id="arena" className="space-y-6">
            <PromptArenaControl
              prompt={arena.prompt}
              onPromptChange={arena.setPrompt}
              cerebrasModel={arena.cerebrasModel}
              onCerebrasModelChange={arena.setCerebrasModel}
              groqModel={arena.groqModel}
              onGroqModelChange={arena.setGroqModel}
              maxTokens={arena.maxTokens}
              onMaxTokensChange={arena.setMaxTokens}
              temperature={arena.temperature}
              onTemperatureChange={arena.setTemperature}
              prediction={arena.prediction}
              onPredictionChange={arena.setPrediction}
              modelsCatalog={arena.modelsCatalog}
              isRunning={arena.isRunning}
              multiRoundTarget={arena.multiRoundTarget}
              currentRoundIndex={arena.currentRoundIndex}
              onRunComparison={arena.runComparison}
              onStopComparison={arena.stopComparison}
              onResetArena={arena.resetArena}
            />

            {arena.globalError && (
              <div
                role="alert"
                className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
              >
                {arena.globalError}
              </div>
            )}

            {/* Side-by-Side Live Streaming Panels */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
              <ProviderPanel
                provider="cerebras"
                state={arena.cerebrasState}
                isFasterTtft={arena.latestSummary?.fasterByTtft === 'cerebras'}
                isFasterTotal={arena.latestSummary?.fasterByTotalTime === 'cerebras'}
                onClear={() => arena.clearProviderPanel('cerebras')}
                onRetry={() => arena.runComparison(1)}
                canRetry={!arena.isRunning && arena.prompt.trim().length > 0}
              />

              <ProviderPanel
                provider="groq"
                state={arena.groqState}
                isFasterTtft={arena.latestSummary?.fasterByTtft === 'groq'}
                isFasterTotal={arena.latestSummary?.fasterByTotalTime === 'groq'}
                onClear={() => arena.clearProviderPanel('groq')}
                onRetry={() => arena.runComparison(1)}
                canRetry={!arena.isRunning && arena.prompt.trim().length > 0}
              />
            </div>
          </section>

          {/* Real-Time Performance Metrics & Charts */}
          <PerformanceDashboard
            cerebrasState={arena.cerebrasState}
            groqState={arena.groqState}
            latestSummary={arena.latestSummary}
          />

          {/* Audience Interaction & Quality Voting */}
          <AudienceSection
            latestSummary={arena.latestSummary}
            votes={arena.votes}
            hasVotedThisRound={arena.hasVotedThisRound}
            isVoting={arena.isVoting}
            onVote={arena.castVote}
            onResetVotes={arena.resetVotes}
          />

          {/* Multiple Round Summary */}
          <MultiRoundSummary
            records={arena.multiRoundResults}
            targetRounds={arena.multiRoundTarget}
            isRunning={arena.isRunning}
            currentRoundIndex={arena.currentRoundIndex}
          />
        </div>
      </main>

      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          Cerebras — Live AI Speed Challenge · Real-time concurrent Server-Sent Events benchmark
        </div>
      </footer>

      <PresentationModal
        isOpen={presentationOpen}
        onClose={() => setPresentationOpen(false)}
        prompt={arena.prompt}
        cerebrasState={arena.cerebrasState}
        groqState={arena.groqState}
        latestSummary={arena.latestSummary}
        votes={arena.votes}
        isRunning={arena.isRunning}
        onRunAgain={() => arena.runComparison(1)}
      />
    </div>
  );
}
