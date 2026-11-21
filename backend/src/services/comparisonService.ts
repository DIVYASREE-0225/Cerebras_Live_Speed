import crypto from 'node:crypto';
import type { Response } from 'express';
import { streamProviderCompletion } from '../providers/openaiCompatibleStream.ts';
import type {
  ComparisonRequestPayload,
  ComparisonSummary,
  ProviderId,
  ProviderMetrics,
} from '../types/comparison.ts';
import { sessionStore } from './sessionStore.ts';

function writeSseEvent(res: Response, eventName: string, data: unknown): void {
  if (res.writableEnded || res.destroyed) return;
  res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
}

function normalizeModelBase(modelId: string): string {
  const parts = modelId.toLowerCase().split('/');
  return parts[parts.length - 1].replace(/[^a-z0-9]/g, '');
}

function computeWinnerAndDiff(
  cerebrasVal: number | null | undefined,
  groqVal: number | null | undefined
): { winner: ProviderId | 'tie' | null; diffMs: number | null } {
  if (
    typeof cerebrasVal !== 'number' ||
    typeof groqVal !== 'number' ||
    !Number.isFinite(cerebrasVal) ||
    !Number.isFinite(groqVal)
  ) {
    return { winner: null, diffMs: null };
  }

  const diff = Math.round(Math.abs(cerebrasVal - groqVal) * 100) / 100;
  if (diff < 1) {
    return { winner: 'tie', diffMs: 0 };
  }
  return {
    winner: cerebrasVal < groqVal ? 'cerebras' : 'groq',
    diffMs: diff,
  };
}

export async function runConcurrentComparison(
  payload: ComparisonRequestPayload,
  res: Response,
  clientAbortController: AbortController
): Promise<void> {
  const comparisonId = crypto.randomUUID();
  const sameBaseModel =
    normalizeModelBase(payload.cerebrasModel) === normalizeModelBase(payload.groqModel);

  writeSseEvent(res, 'comparison_started', {
    comparisonId,
    cerebrasModel: payload.cerebrasModel,
    groqModel: payload.groqModel,
    sameBaseModel,
    maxTokens: payload.maxTokens,
    temperature: payload.temperature,
    prediction: payload.prediction ?? null,
    roundIndex: payload.roundIndex ?? null,
    totalRounds: payload.totalRounds ?? null,
    startedAt: new Date().toISOString(),
  });

  let cerebrasMetrics: ProviderMetrics | null = null;
  let groqMetrics: ProviderMetrics | null = null;
  let cerebrasError: string | null = null;
  let groqError: string | null = null;

  const callbacks = {
    onStarted: (provider: ProviderId, model: string) => {
      writeSseEvent(res, 'provider_started', {
        comparisonId,
        provider,
        model,
      });
    },
    onFirstToken: (provider: ProviderId, ttftMs: number) => {
      writeSseEvent(res, 'provider_first_token', {
        comparisonId,
        provider,
        ttftMs,
      });
    },
    onChunk: (provider: ProviderId, contentDelta: string, reasoningDelta: string) => {
      writeSseEvent(res, 'provider_chunk', {
        comparisonId,
        provider,
        contentDelta,
        reasoningDelta,
      });
    },
    onCompleted: (provider: ProviderId, metrics: ProviderMetrics) => {
      writeSseEvent(res, 'provider_completed', {
        comparisonId,
        provider,
        metrics,
      });
    },
    onError: (provider: ProviderId, errorMessage: string, statusCode?: number) => {
      writeSseEvent(res, 'provider_error', {
        comparisonId,
        provider,
        error: errorMessage,
        statusCode: statusCode ?? 500,
      });
    },
  };

  // Start both inference requests concurrently without waiting for either
  const [cerebrasResult, groqResult] = await Promise.allSettled([
    streamProviderCompletion({
      provider: 'cerebras',
      model: payload.cerebrasModel,
      prompt: payload.prompt,
      maxTokens: payload.maxTokens,
      temperature: payload.temperature,
      signal: clientAbortController.signal,
      callbacks,
    }),
    streamProviderCompletion({
      provider: 'groq',
      model: payload.groqModel,
      prompt: payload.prompt,
      maxTokens: payload.maxTokens,
      temperature: payload.temperature,
      signal: clientAbortController.signal,
      callbacks,
    }),
  ]);

  if (cerebrasResult.status === 'fulfilled') {
    if (cerebrasResult.value.ok) {
      cerebrasMetrics = cerebrasResult.value.metrics;
    } else {
      cerebrasError = cerebrasResult.value.error;
    }
  } else {
    cerebrasError = 'Unexpected error executing Cerebras stream.';
  }

  if (groqResult.status === 'fulfilled') {
    if (groqResult.value.ok) {
      groqMetrics = groqResult.value.metrics;
    } else {
      groqError = groqResult.value.error;
    }
  } else {
    groqError = 'Unexpected error executing Groq stream.';
  }

  const ttftComparison = computeWinnerAndDiff(cerebrasMetrics?.ttftMs, groqMetrics?.ttftMs);
  const totalComparison = computeWinnerAndDiff(
    cerebrasMetrics?.totalTimeMs,
    groqMetrics?.totalTimeMs
  );

  // Audience prediction evaluates "WHO WILL RESPOND FIRST?" (measured by TTFT when both succeeded, or total time fallback)
  let predictionCorrect: boolean | null = null;
  const firstResponder =
    ttftComparison.winner && ttftComparison.winner !== 'tie'
      ? ttftComparison.winner
      : totalComparison.winner && totalComparison.winner !== 'tie'
        ? totalComparison.winner
        : null;

  if (payload.prediction && firstResponder) {
    predictionCorrect = payload.prediction === firstResponder;
  }

  const summary: ComparisonSummary = {
    comparisonId,
    timestamp: new Date().toISOString(),
    promptPreview:
      payload.prompt.length > 120 ? `${payload.prompt.slice(0, 120)}...` : payload.prompt,
    cerebrasModel: payload.cerebrasModel,
    groqModel: payload.groqModel,
    sameBaseModel,
    fasterByTtft: ttftComparison.winner,
    ttftDifferenceMs: ttftComparison.diffMs,
    fasterByTotalTime: totalComparison.winner,
    totalTimeDifferenceMs: totalComparison.diffMs,
    cerebras: cerebrasMetrics,
    groq: groqMetrics,
    cerebrasError,
    groqError,
    prediction: payload.prediction ?? null,
    predictionCorrect,
  };

  if (!clientAbortController.signal.aborted) {
    sessionStore.recordComparison(summary);
    writeSseEvent(res, 'comparison_completed', {
      comparisonId,
      summary,
      votes: sessionStore.getVoteStats(),
    });
  }
}
