export type ProviderId = 'cerebras' | 'groq';

export type ProviderStatus =
  | 'waiting'
  | 'connecting'
  | 'generating'
  | 'completed'
  | 'failed';

export type TokenCountSource = 'provider_usage' | 'estimated_tiktoken' | 'unavailable';

export type ThroughputSource = 'measured_usage' | 'estimated_tokens' | 'unavailable';

export interface ModelInfo {
  id: string;
  name: string;
  ownedBy: string;
  contextLength?: number;
  maxCompletionTokens?: number;
}

export interface HealthStatus {
  status: 'ok';
  timestamp: string;
  providers: {
    cerebras: {
      configured: boolean;
      defaultModel: string;
    };
    groq: {
      configured: boolean;
      defaultModel: string;
    };
  };
}

export interface ModelsResponse {
  defaults: {
    cerebras: string;
    groq: string;
  };
  configured: {
    cerebras: boolean;
    groq: boolean;
  };
  models: {
    cerebras: ModelInfo[];
    groq: ModelInfo[];
  };
  source: {
    cerebras: 'live_api' | 'fallback_defaults';
    groq: 'live_api' | 'fallback_defaults';
  };
}

export interface ProviderTimeInfo {
  queueTimeSec?: number;
  promptTimeSec?: number;
  completionTimeSec?: number;
  totalTimeSec?: number;
}

export interface ProviderMetrics {
  provider: ProviderId;
  model: string;
  ttftMs: number | null;
  totalTimeMs: number;
  generationTimeMs: number | null;
  outputTokens: number | null;
  promptTokens: number | null;
  totalTokens: number | null;
  tokenCountSource: TokenCountSource;
  tokensPerSecond: number | null;
  throughputSource: ThroughputSource;
  providerTimeInfo?: ProviderTimeInfo;
}

export interface ProviderStreamState {
  status: ProviderStatus;
  model: string;
  content: string;
  reasoning: string;
  liveElapsedMs: number | null;
  ttftMs: number | null;
  metrics: ProviderMetrics | null;
  error: string | null;
}

export interface ComparisonSummary {
  comparisonId: string;
  timestamp: string;
  promptPreview: string;
  cerebrasModel: string;
  groqModel: string;
  sameBaseModel: boolean;
  fasterByTtft: ProviderId | 'tie' | null;
  ttftDifferenceMs: number | null;
  fasterByTotalTime: ProviderId | 'tie' | null;
  totalTimeDifferenceMs: number | null;
  cerebras: ProviderMetrics | null;
  groq: ProviderMetrics | null;
  cerebrasError: string | null;
  groqError: string | null;
  prediction: ProviderId | null;
  predictionCorrect: boolean | null;
}

export interface VoteStats {
  cerebras: number;
  groq: number;
  equal: number;
  totalVotes: number;
  cerebrasPercent: number;
  groqPercent: number;
  equalPercent: number;
  predictionsTotal: number;
  predictionsCorrect: number;
  persistenceNote: string;
}

export interface SessionResultsResponse {
  votes: VoteStats;
  latestComparison: ComparisonSummary | null;
  recentComparisons: ComparisonSummary[];
}

export interface MultiRoundRecord {
  round: number;
  summary: ComparisonSummary;
}

export interface ComparePayload {
  prompt: string;
  cerebrasModel: string;
  groqModel: string;
  maxTokens: number;
  temperature: number;
  prediction?: ProviderId | null;
  roundIndex?: number;
  totalRounds?: number;
}
