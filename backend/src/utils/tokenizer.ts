import { getEncoding } from 'js-tiktoken';
import type { Tiktoken } from 'js-tiktoken';
import type {
  ProviderId,
  ProviderMetrics,
  ProviderTimeInfo,
  ThroughputSource,
  TokenCountSource,
} from '../types/comparison.ts';

let cachedEncoder: Tiktoken | null = null;

function getEncoder(): Tiktoken | null {
  if (cachedEncoder) return cachedEncoder;
  try {
    cachedEncoder = getEncoding('cl100k_base');
    return cachedEncoder;
  } catch {
    return null;
  }
}

export function estimateTokens(text: string): number | null {
  if (!text) return 0;
  const enc = getEncoder();
  if (!enc) return null;
  try {
    return enc.encode(text).length;
  } catch {
    return null;
  }
}

export interface BuildMetricsInput {
  provider: ProviderId;
  model: string;
  ttftMs: number | null;
  totalTimeMs: number;
  generatedText: string;
  providerUsage: {
    promptTokens?: number | null;
    completionTokens?: number | null;
    totalTokens?: number | null;
  } | null;
  providerTimeInfo?: ProviderTimeInfo;
}

export function buildProviderMetrics(input: BuildMetricsInput): ProviderMetrics {
  const {
    provider,
    model,
    ttftMs,
    totalTimeMs,
    generatedText,
    providerUsage,
    providerTimeInfo,
  } = input;

  let outputTokens: number | null = null;
  let promptTokens: number | null = providerUsage?.promptTokens ?? null;
  let totalTokens: number | null = providerUsage?.totalTokens ?? null;
  let tokenCountSource: TokenCountSource = 'unavailable';

  if (
    providerUsage &&
    typeof providerUsage.completionTokens === 'number' &&
    Number.isFinite(providerUsage.completionTokens) &&
    providerUsage.completionTokens >= 0
  ) {
    outputTokens = providerUsage.completionTokens;
    tokenCountSource = 'provider_usage';
  } else if (generatedText.length > 0) {
    const estimated = estimateTokens(generatedText);
    if (estimated !== null) {
      outputTokens = estimated;
      tokenCountSource = 'estimated_tiktoken';
    }
  } else if (generatedText.length === 0) {
    outputTokens = 0;
    tokenCountSource = providerUsage ? 'provider_usage' : 'unavailable';
  }

  const generationTimeMs =
    ttftMs !== null
      ? Math.max(0, Math.round((totalTimeMs - ttftMs) * 100) / 100)
      : null;

  let tokensPerSecond: number | null = null;
  let throughputSource: ThroughputSource = 'unavailable';

  // Exact required formula: Output tokens / (Total generation time - Time to first token)
  // Guard against near-zero denominator (e.g. single-chunk instantaneous flush)
  if (
    outputTokens !== null &&
    outputTokens > 0 &&
    generationTimeMs !== null &&
    generationTimeMs >= 1
  ) {
    const tps = outputTokens / (generationTimeMs / 1000);
    if (Number.isFinite(tps) && tps > 0) {
      tokensPerSecond = Math.round(tps * 10) / 10;
      throughputSource =
        tokenCountSource === 'provider_usage'
          ? 'measured_usage'
          : 'estimated_tokens';
    }
  }

  return {
    provider,
    model,
    ttftMs,
    totalTimeMs,
    generationTimeMs,
    outputTokens,
    promptTokens,
    totalTokens,
    tokenCountSource,
    tokensPerSecond,
    throughputSource,
    providerTimeInfo,
  };
}
