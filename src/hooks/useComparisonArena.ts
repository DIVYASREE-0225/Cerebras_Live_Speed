import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchHealth,
  fetchModels,
  fetchSessionResults,
  resetSessionVotes,
  streamComparison,
  submitAudienceVote,
} from '../services/apiClient';
import type {
  ComparisonSummary,
  HealthStatus,
  ModelsResponse,
  MultiRoundRecord,
  ProviderId,
  ProviderStreamState,
  VoteStats,
} from '../types/arena';

function createInitialProviderState(model: string): ProviderStreamState {
  return {
    status: 'waiting',
    model,
    content: '',
    reasoning: '',
    liveElapsedMs: null,
    ttftMs: null,
    metrics: null,
    error: null,
  };
}

const DEFAULT_VOTES: VoteStats = {
  cerebras: 0,
  groq: 0,
  equal: 0,
  totalVotes: 0,
  cerebrasPercent: 0,
  groqPercent: 0,
  equalPercent: 0,
  predictionsTotal: 0,
  predictionsCorrect: 0,
  persistenceNote: 'In-memory session store (active for the current server session only)',
};

export function useComparisonArena() {
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [modelsCatalog, setModelsCatalog] = useState<ModelsResponse | null>(null);

  const [prompt, setPrompt] = useState<string>('');
  const [cerebrasModel, setCerebrasModel] = useState<string>('gpt-oss-120b');
  const [groqModel, setGroqModel] = useState<string>('openai/gpt-oss-120b');
  const [maxTokens, setMaxTokens] = useState<number>(1024);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [prediction, setPrediction] = useState<ProviderId | null>(null);

  const [cerebrasState, setCerebrasState] = useState<ProviderStreamState>(() =>
    createInitialProviderState('gpt-oss-120b')
  );
  const [groqState, setGroqState] = useState<ProviderStreamState>(() =>
    createInitialProviderState('openai/gpt-oss-120b')
  );

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [latestSummary, setLatestSummary] = useState<ComparisonSummary | null>(null);
  const [votes, setVotes] = useState<VoteStats>(DEFAULT_VOTES);
  const [hasVotedThisRound, setHasVotedThisRound] = useState<boolean>(false);
  const [isVoting, setIsVoting] = useState<boolean>(false);

  const [multiRoundTarget, setMultiRoundTarget] = useState<number>(1);
  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(0);
  const [multiRoundResults, setMultiRoundResults] = useState<MultiRoundRecord[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isRunningRef = useRef<boolean>(false);
  const startTimestampsRef = useRef<{ cerebras: number | null; groq: number | null }>({
    cerebras: null,
    groq: null,
  });

  const refreshConnection = useCallback(async () => {
    try {
      const [healthRes, modelsRes, resultsRes] = await Promise.all([
        fetchHealth(),
        fetchModels(),
        fetchSessionResults(),
      ]);
      setHealth(healthRes);
      setBackendConnected(true);
      setModelsCatalog(modelsRes);
      setCerebrasModel((prev) =>
        modelsRes.models.cerebras.some((m) => m.id === prev) ? prev : modelsRes.defaults.cerebras
      );
      setGroqModel((prev) =>
        modelsRes.models.groq.some((m) => m.id === prev) ? prev : modelsRes.defaults.groq
      );
      setVotes(resultsRes.votes);
    } catch {
      setBackendConnected(false);
    }
  }, []);

  useEffect(() => {
    void refreshConnection();
    const interval = setInterval(async () => {
      try {
        const h = await fetchHealth();
        setHealth(h);
        setBackendConnected(true);
      } catch {
        setBackendConnected(false);
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [refreshConnection]);

  // Smooth client-side live elapsed stopwatch while streaming (replaced by exact backend monotonic ms on completion)
  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => {
      const now = performance.now();
      setCerebrasState((prev) => {
        if (
          (prev.status === 'connecting' || prev.status === 'generating') &&
          startTimestampsRef.current.cerebras !== null
        ) {
          return {
            ...prev,
            liveElapsedMs: Math.round(now - startTimestampsRef.current.cerebras),
          };
        }
        return prev;
      });
      setGroqState((prev) => {
        if (
          (prev.status === 'connecting' || prev.status === 'generating') &&
          startTimestampsRef.current.groq !== null
        ) {
          return {
            ...prev,
            liveElapsedMs: Math.round(now - startTimestampsRef.current.groq),
          };
        }
        return prev;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [isRunning]);

  const executeSingleRound = useCallback(
    async (
      promptText: string,
      cModel: string,
      gModel: string,
      tokensLimit: number,
      tempVal: number,
      pred: ProviderId | null,
      roundIdx?: number,
      totalRds?: number,
      signal?: AbortSignal
    ): Promise<ComparisonSummary | null> => {
      setCerebrasState({
        status: 'connecting',
        model: cModel,
        content: '',
        reasoning: '',
        liveElapsedMs: 0,
        ttftMs: null,
        metrics: null,
        error: null,
      });
      setGroqState({
        status: 'connecting',
        model: gModel,
        content: '',
        reasoning: '',
        liveElapsedMs: 0,
        ttftMs: null,
        metrics: null,
        error: null,
      });

      const startNow = performance.now();
      startTimestampsRef.current = { cerebras: startNow, groq: startNow };

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const activeSignal = signal
        ? AbortSignal.any([signal, controller.signal])
        : controller.signal;

      const summary = await streamComparison(
        {
          prompt: promptText,
          cerebrasModel: cModel,
          groqModel: gModel,
          maxTokens: tokensLimit,
          temperature: tempVal,
          prediction: pred,
          roundIndex: roundIdx,
          totalRounds: totalRds,
        },
        {
          onProviderStarted: ({ provider, model }) => {
            const t = performance.now();
            startTimestampsRef.current[provider] = t;
            const setter = provider === 'cerebras' ? setCerebrasState : setGroqState;
            setter((prev) => ({
              ...prev,
              status: 'connecting',
              model,
            }));
          },
          onProviderFirstToken: ({ provider, ttftMs }) => {
            const setter = provider === 'cerebras' ? setCerebrasState : setGroqState;
            setter((prev) => ({
              ...prev,
              status: 'generating',
              ttftMs,
            }));
          },
          onProviderChunk: ({ provider, contentDelta, reasoningDelta }) => {
            const setter = provider === 'cerebras' ? setCerebrasState : setGroqState;
            setter((prev) => ({
              ...prev,
              status: prev.status === 'connecting' ? 'generating' : prev.status,
              content: contentDelta ? prev.content + contentDelta : prev.content,
              reasoning: reasoningDelta ? prev.reasoning + reasoningDelta : prev.reasoning,
            }));
          },
          onProviderCompleted: ({ provider, metrics }) => {
            const setter = provider === 'cerebras' ? setCerebrasState : setGroqState;
            setter((prev) => ({
              ...prev,
              status: 'completed',
              ttftMs: metrics.ttftMs,
              liveElapsedMs: metrics.totalTimeMs,
              metrics,
            }));
          },
          onProviderError: ({ provider, error }) => {
            const setter = provider === 'cerebras' ? setCerebrasState : setGroqState;
            setter((prev) => ({
              ...prev,
              status: 'failed',
              error,
            }));
          },
          onComparisonCompleted: ({ summary: completedSummary, votes: updatedVotes }) => {
            setLatestSummary(completedSummary);
            setVotes(updatedVotes);
          },
        },
        activeSignal
      );

      return summary;
    },
    []
  );

  const runComparison = useCallback(
    async (rounds = 1) => {
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt || isRunningRef.current) return;

      isRunningRef.current = true;
      setIsRunning(true);
      setGlobalError(null);
      setHasVotedThisRound(false);
      setLatestSummary(null);
      setMultiRoundTarget(rounds);
      setMultiRoundResults([]);

      const masterAbort = new AbortController();
      abortControllerRef.current = masterAbort;

      try {
        for (let r = 1; r <= rounds; r++) {
          if (masterAbort.signal.aborted) break;
          setCurrentRoundIndex(r);

          const summary = await executeSingleRound(
            trimmedPrompt,
            cerebrasModel,
            groqModel,
            maxTokens,
            temperature,
            r === 1 ? prediction : null,
            rounds > 1 ? r : undefined,
            rounds > 1 ? rounds : undefined,
            masterAbort.signal
          );

          if (summary && rounds > 1) {
            setMultiRoundResults((prev) => [...prev, { round: r, summary }]);
          }
        }
      } catch (err) {
        if (!masterAbort.signal.aborted) {
          const msg = err instanceof Error ? err.message : 'Comparison request failed.';
          setGlobalError(msg);
          setCerebrasState((prev) =>
            prev.status === 'connecting' || prev.status === 'generating'
              ? { ...prev, status: 'failed', error: prev.error || msg }
              : prev
          );
          setGroqState((prev) =>
            prev.status === 'connecting' || prev.status === 'generating'
              ? { ...prev, status: 'failed', error: prev.error || msg }
              : prev
          );
        }
      } finally {
        isRunningRef.current = false;
        setIsRunning(false);
        abortControllerRef.current = null;
      }
    },
    [
      prompt,
      cerebrasModel,
      groqModel,
      maxTokens,
      temperature,
      prediction,
      executeSingleRound,
    ]
  );

  const stopComparison = useCallback(() => {
    abortControllerRef.current?.abort();
    isRunningRef.current = false;
    setIsRunning(false);
  }, []);

  const clearProviderPanel = useCallback((provider: ProviderId) => {
    if (provider === 'cerebras') {
      setCerebrasState((prev) => ({
        ...createInitialProviderState(prev.model),
      }));
    } else {
      setGroqState((prev) => ({
        ...createInitialProviderState(prev.model),
      }));
    }
  }, []);

  const resetArena = useCallback(() => {
    abortControllerRef.current?.abort();
    isRunningRef.current = false;
    setIsRunning(false);
    setPrompt('');
    setPrediction(null);
    setGlobalError(null);
    setLatestSummary(null);
    setHasVotedThisRound(false);
    setMultiRoundTarget(1);
    setCurrentRoundIndex(0);
    setMultiRoundResults([]);
    setCerebrasState(createInitialProviderState(cerebrasModel));
    setGroqState(createInitialProviderState(groqModel));
  }, [cerebrasModel, groqModel]);

  const castVote = useCallback(
    async (option: 'cerebras' | 'groq' | 'equal') => {
      if (isVoting) return;
      setIsVoting(true);
      try {
        const updatedVotes = await submitAudienceVote(option, latestSummary?.comparisonId);
        setVotes(updatedVotes);
        setHasVotedThisRound(true);
      } catch (err) {
        setGlobalError(err instanceof Error ? err.message : 'Unable to submit vote.');
      } finally {
        setIsVoting(false);
      }
    },
    [isVoting, latestSummary]
  );

  const resetVotes = useCallback(async () => {
    try {
      const resetRes = await resetSessionVotes();
      setVotes(resetRes.votes);
      setHasVotedThisRound(false);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Unable to reset session votes.');
    }
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    backendConnected,
    health,
    modelsCatalog,
    prompt,
    setPrompt,
    cerebrasModel,
    setCerebrasModel,
    groqModel,
    setGroqModel,
    maxTokens,
    setMaxTokens,
    temperature,
    setTemperature,
    prediction,
    setPrediction,
    cerebrasState,
    groqState,
    isRunning,
    globalError,
    latestSummary,
    votes,
    hasVotedThisRound,
    isVoting,
    multiRoundTarget,
    currentRoundIndex,
    multiRoundResults,
    runComparison,
    stopComparison,
    clearProviderPanel,
    resetArena,
    castVote,
    resetVotes,
    refreshConnection,
  };
}
