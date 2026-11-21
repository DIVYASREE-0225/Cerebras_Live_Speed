import type {
  ComparePayload,
  ComparisonSummary,
  HealthStatus,
  ModelsResponse,
  ProviderId,
  ProviderMetrics,
  SessionResultsResponse,
  VoteStats,
} from '../types/arena';

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch('/api/health');
  if (!res.ok) {
    throw new Error(`Backend health check failed (${res.status})`);
  }
  return (await res.json()) as HealthStatus;
}

export async function fetchModels(): Promise<ModelsResponse> {
  const res = await fetch('/api/models');
  if (!res.ok) {
    throw new Error(`Failed to load models (${res.status})`);
  }
  return (await res.json()) as ModelsResponse;
}

export async function fetchSessionResults(): Promise<SessionResultsResponse> {
  const res = await fetch('/api/results');
  if (!res.ok) {
    throw new Error(`Failed to load session results (${res.status})`);
  }
  return (await res.json()) as SessionResultsResponse;
}

export async function submitAudienceVote(
  vote: 'cerebras' | 'groq' | 'equal',
  comparisonId?: string
): Promise<VoteStats> {
  const res = await fetch('/api/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vote, comparisonId }),
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || `Vote request failed (${res.status})`);
  }

  const data = (await res.json()) as { votes: VoteStats };
  return data.votes;
}

export async function resetSessionVotes(): Promise<SessionResultsResponse> {
  const res = await fetch('/api/results/reset', { method: 'POST' });
  if (!res.ok) {
    throw new Error(`Failed to reset session stats (${res.status})`);
  }
  return (await res.json()) as SessionResultsResponse;
}

export interface StreamHandlers {
  onComparisonStarted?: (data: {
    comparisonId: string;
    cerebrasModel: string;
    groqModel: string;
    sameBaseModel: boolean;
  }) => void;
  onProviderStarted?: (data: {
    comparisonId: string;
    provider: ProviderId;
    model: string;
  }) => void;
  onProviderFirstToken?: (data: {
    comparisonId: string;
    provider: ProviderId;
    ttftMs: number;
  }) => void;
  onProviderChunk?: (data: {
    comparisonId: string;
    provider: ProviderId;
    contentDelta: string;
    reasoningDelta: string;
  }) => void;
  onProviderCompleted?: (data: {
    comparisonId: string;
    provider: ProviderId;
    metrics: ProviderMetrics;
  }) => void;
  onProviderError?: (data: {
    comparisonId: string;
    provider: ProviderId;
    error: string;
    statusCode?: number;
  }) => void;
  onComparisonCompleted?: (data: {
    comparisonId: string;
    summary: ComparisonSummary;
    votes: VoteStats;
  }) => void;
}

export async function streamComparison(
  payload: ComparePayload,
  handlers: StreamHandlers,
  signal: AbortSignal
): Promise<ComparisonSummary | null> {
  const response = await fetch('/api/compare', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    let errMsg = `Comparison request failed (${response.status})`;
    try {
      const json = (await response.json()) as { error?: string };
      if (json.error) errMsg = json.error;
    } catch {
      // ignore non-json body
    }
    throw new Error(errMsg);
  }

  if (!response.body) {
    throw new Error('Server did not return a readable SSE stream.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let latestSummary: ComparisonSummary | null = null;

  const dispatchEvent = (eventName: string, rawData: string) => {
    if (!rawData) return;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawData) as Record<string, unknown>;
    } catch {
      return;
    }

    switch (eventName) {
      case 'comparison_started':
        handlers.onComparisonStarted?.(
          parsed as {
            comparisonId: string;
            cerebrasModel: string;
            groqModel: string;
            sameBaseModel: boolean;
          }
        );
        break;
      case 'provider_started':
        handlers.onProviderStarted?.(
          parsed as { comparisonId: string; provider: ProviderId; model: string }
        );
        break;
      case 'provider_first_token':
        handlers.onProviderFirstToken?.(
          parsed as { comparisonId: string; provider: ProviderId; ttftMs: number }
        );
        break;
      case 'provider_chunk':
        handlers.onProviderChunk?.(
          parsed as {
            comparisonId: string;
            provider: ProviderId;
            contentDelta: string;
            reasoningDelta: string;
          }
        );
        break;
      case 'provider_completed':
        handlers.onProviderCompleted?.(
          parsed as { comparisonId: string; provider: ProviderId; metrics: ProviderMetrics }
        );
        break;
      case 'provider_error':
        handlers.onProviderError?.(
          parsed as {
            comparisonId: string;
            provider: ProviderId;
            error: string;
            statusCode?: number;
          }
        );
        break;
      case 'comparison_completed': {
        const payloadData = parsed as {
          comparisonId: string;
          summary: ComparisonSummary;
          votes: VoteStats;
        };
        latestSummary = payloadData.summary;
        handlers.onComparisonCompleted?.(payloadData);
        break;
      }
      case 'comparison_error': {
        const errData = parsed as { error?: string };
        throw new Error(errData.error || 'Comparison failed on server.');
      }
      default:
        break;
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    // SSE frames are separated by double newline (\n\n or \r\n\r\n)
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const lines = frame.split(/\r?\n/);
      let eventName = 'message';
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trim());
        }
      }

      if (dataLines.length > 0) {
        dispatchEvent(eventName, dataLines.join('\n'));
      }
    }
  }

  return latestSummary;
}
