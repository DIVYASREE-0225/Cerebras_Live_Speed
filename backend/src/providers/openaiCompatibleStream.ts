import { envConfig } from '../config/env.ts';
import type { ProviderId, ProviderMetrics, ProviderTimeInfo } from '../types/comparison.ts';
import { elapsedMs, nowNs } from '../utils/timing.ts';
import { buildProviderMetrics } from '../utils/tokenizer.ts';

export interface StreamProviderCallbacks {
  onStarted: (provider: ProviderId, model: string) => void;
  onFirstToken: (provider: ProviderId, ttftMs: number) => void;
  onChunk: (provider: ProviderId, contentDelta: string, reasoningDelta: string) => void;
  onCompleted: (provider: ProviderId, metrics: ProviderMetrics) => void;
  onError: (provider: ProviderId, errorMessage: string, statusCode?: number) => void;
}

export interface StreamProviderParams {
  provider: ProviderId;
  model: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
  signal: AbortSignal;
  callbacks: StreamProviderCallbacks;
}

interface ProviderEndpointConfig {
  url: string;
  apiKey: string;
  displayName: string;
}

function getEndpointConfig(provider: ProviderId): ProviderEndpointConfig {
  if (provider === 'cerebras') {
    return {
      url: 'https://api.cerebras.ai/v1/chat/completions',
      apiKey: envConfig.cerebrasApiKey,
      displayName: 'Cerebras',
    };
  }
  return {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    apiKey: envConfig.groqApiKey,
    displayName: 'Groq',
  };
}

function formatProviderHttpError(
  providerName: string,
  status: number,
  rawMessage: string
): string {
  const safeSnippet = rawMessage
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .slice(0, 240);

  if (status === 401 || status === 403) {
    return `${providerName} authentication failed (${status}): verify that your server API key is valid and active.`;
  }
  if (status === 404) {
    return `${providerName} model not found or endpoint unavailable (${status}): ${safeSnippet || 'check configured model ID.'}`;
  }
  if (status === 429) {
    return `${providerName} rate limit reached (429): ${safeSnippet || 'please wait briefly before retrying.'}`;
  }
  if (status === 400 || status === 422) {
    return `${providerName} rejected the request (${status}): ${safeSnippet || 'check model ID and parameters.'}`;
  }
  if (status >= 500) {
    return `${providerName} service error (${status}): upstream inference server encountered an error.`;
  }
  return `${providerName} API error (${status}): ${safeSnippet || 'unexpected response.'}`;
}

export async function streamProviderCompletion(
  params: StreamProviderParams
): Promise<{ ok: true; metrics: ProviderMetrics } | { ok: false; error: string }> {
  const { provider, model, prompt, maxTokens, temperature, signal, callbacks } = params;
  const { url, apiKey, displayName } = getEndpointConfig(provider);

  if (!apiKey || apiKey === 'your_cerebras_api_key' || apiKey === 'your_groq_api_key') {
    const msg = `${displayName} API key is not configured on the server. Set ${
      provider === 'cerebras' ? 'CEREBRAS_API_KEY' : 'GROQ_API_KEY'
    } in your environment.`;
    callbacks.onError(provider, msg, 503);
    return { ok: false, error: msg };
  }

  const timeoutController = new AbortController();
  const timeoutHandle = setTimeout(() => {
    timeoutController.abort(new Error('Provider request timed out'));
  }, envConfig.requestTimeoutMs);

  const combinedSignal = AbortSignal.any([signal, timeoutController.signal]);

  const startNs = nowNs();
  callbacks.onStarted(provider, model);

  let firstTokenNs: bigint | null = null;
  let generatedContent = '';
  let generatedReasoning = '';
  let promptTokens: number | null = null;
  let completionTokens: number | null = null;
  let totalTokens: number | null = null;
  let hasUsageData = false;
  let providerTimeInfo: ProviderTimeInfo | undefined;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_completion_tokens: maxTokens,
        temperature,
        stream: true,
        stream_options: { include_usage: true },
      }),
      signal: combinedSignal,
    });

    if (!response.ok) {
      let rawDetail = '';
      try {
        const errText = await response.text();
        try {
          const parsed = JSON.parse(errText) as { error?: { message?: string }; message?: string };
          rawDetail = parsed.error?.message || parsed.message || errText;
        } catch {
          rawDetail = errText;
        }
      } catch {
        rawDetail = '';
      }
      const friendlyError = formatProviderHttpError(displayName, response.status, rawDetail);
      callbacks.onError(provider, friendlyError, response.status);
      return { ok: false, error: friendlyError };
    }

    if (!response.body) {
      const msg = `${displayName} returned an empty response stream.`;
      callbacks.onError(provider, msg, 502);
      return { ok: false, error: msg };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let lineBuffer = '';
    let streamDone = false;

    while (!streamDone) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split(/\r?\n/);
      lineBuffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith(':')) {
          continue;
        }
        if (!line.startsWith('data:')) {
          continue;
        }

        const dataPayload = line.slice(5).trim();
        if (dataPayload === '[DONE]') {
          streamDone = true;
          break;
        }

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(dataPayload) as Record<string, unknown>;
        } catch {
          continue;
        }

        if (parsed.error && typeof parsed.error === 'object') {
          const errObj = parsed.error as { message?: string };
          const streamErr = formatProviderHttpError(
            displayName,
            502,
            errObj.message || 'Streaming error from provider'
          );
          callbacks.onError(provider, streamErr, 502);
          return { ok: false, error: streamErr };
        }

        // Capture usage metadata if returned in top-level usage or x_groq.usage
        const topUsage = parsed.usage as
          | { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
          | undefined;
        const xGroq = parsed.x_groq as
          | {
              usage?: {
                prompt_tokens?: number;
                completion_tokens?: number;
                total_tokens?: number;
                queue_time?: number;
                prompt_time?: number;
                completion_time?: number;
                total_time?: number;
              };
            }
          | undefined;

        const chosenUsage = topUsage || xGroq?.usage;
        if (chosenUsage) {
          hasUsageData = true;
          if (typeof chosenUsage.prompt_tokens === 'number') {
            promptTokens = chosenUsage.prompt_tokens;
          }
          if (typeof chosenUsage.completion_tokens === 'number') {
            completionTokens = chosenUsage.completion_tokens;
          }
          if (typeof chosenUsage.total_tokens === 'number') {
            totalTokens = chosenUsage.total_tokens;
          }
        }

        if (xGroq?.usage) {
          providerTimeInfo = {
            queueTimeSec: xGroq.usage.queue_time,
            promptTimeSec: xGroq.usage.prompt_time,
            completionTimeSec: xGroq.usage.completion_time,
            totalTimeSec: xGroq.usage.total_time,
          };
        }

        const cerebrasTimeInfo = parsed.time_info as
          | {
              queue_time?: number;
              prompt_time?: number;
              completion_time?: number;
              total_time?: number;
            }
          | undefined;
        if (cerebrasTimeInfo) {
          providerTimeInfo = {
            queueTimeSec: cerebrasTimeInfo.queue_time,
            promptTimeSec: cerebrasTimeInfo.prompt_time,
            completionTimeSec: cerebrasTimeInfo.completion_time,
            totalTimeSec: cerebrasTimeInfo.total_time,
          };
        }

        const choices = parsed.choices as
          | Array<{
              delta?: {
                content?: string | null;
                reasoning?: string | null;
                reasoning_content?: string | null;
              };
            }>
          | undefined;

        const delta = choices?.[0]?.delta;
        if (!delta) {
          continue;
        }

        const contentDelta = typeof delta.content === 'string' ? delta.content : '';
        const reasoningDelta =
          typeof delta.reasoning === 'string'
            ? delta.reasoning
            : typeof delta.reasoning_content === 'string'
              ? delta.reasoning_content
              : '';

        if (contentDelta.length > 0 || reasoningDelta.length > 0) {
          if (firstTokenNs === null) {
            firstTokenNs = nowNs();
            const ttftMs = elapsedMs(startNs, firstTokenNs);
            callbacks.onFirstToken(provider, ttftMs);
          }

          if (contentDelta.length > 0) {
            generatedContent += contentDelta;
          }
          if (reasoningDelta.length > 0) {
            generatedReasoning += reasoningDelta;
          }

          callbacks.onChunk(provider, contentDelta, reasoningDelta);
        }
      }
    }

    const endNs = nowNs();
    const totalTimeMs = elapsedMs(startNs, endNs);
    const ttftMs = firstTokenNs !== null ? elapsedMs(startNs, firstTokenNs) : null;
    const textForTokenEstimation =
      generatedContent.length > 0 ? generatedContent : generatedReasoning;

    const metrics = buildProviderMetrics({
      provider,
      model,
      ttftMs,
      totalTimeMs,
      generatedText: textForTokenEstimation,
      providerUsage: hasUsageData
        ? { promptTokens, completionTokens, totalTokens }
        : null,
      providerTimeInfo,
    });

    callbacks.onCompleted(provider, metrics);
    return { ok: true, metrics };
  } catch (err) {
    if (signal.aborted) {
      const msg = 'Comparison cancelled by client.';
      callbacks.onError(provider, msg, 499);
      return { ok: false, error: msg };
    }
    if (timeoutController.signal.aborted) {
      const msg = `${displayName} request timed out after ${Math.round(
        envConfig.requestTimeoutMs / 1000
      )}s.`;
      callbacks.onError(provider, msg, 504);
      return { ok: false, error: msg };
    }
    const rawMsg = err instanceof Error ? err.message : 'Unknown network error';
    const msg = `${displayName} network error: ${rawMsg}`;
    callbacks.onError(provider, msg, 502);
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timeoutHandle);
  }
}
