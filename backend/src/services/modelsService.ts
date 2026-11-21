import { envConfig } from '../config/env.ts';
import type { ModelInfo } from '../types/comparison.ts';

interface ModelsCatalog {
  cerebras: ModelInfo[];
  groq: ModelInfo[];
  source: {
    cerebras: 'live_api' | 'fallback_defaults';
    groq: 'live_api' | 'fallback_defaults';
  };
}

const FALLBACK_CEREBRAS_MODELS: ModelInfo[] = [
  {
    id: 'gpt-oss-120b',
    name: 'OpenAI GPT OSS 120B',
    ownedBy: 'OpenAI',
    contextLength: 131072,
    maxCompletionTokens: 40960,
  },
  {
    id: 'qwen-3.8-27b',
    name: 'Qwen 3.8 27B',
    ownedBy: 'Cerebras',
    contextLength: 131072,
    maxCompletionTokens: 32768,
  },
];

const FALLBACK_GROQ_MODELS: ModelInfo[] = [
  {
    id: 'openai/gpt-oss-120b',
    name: 'OpenAI GPT OSS 120B',
    ownedBy: 'OpenAI',
    contextLength: 131072,
    maxCompletionTokens: 32768,
  },
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    ownedBy: 'Meta',
    contextLength: 131072,
    maxCompletionTokens: 32768,
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    ownedBy: 'Meta',
    contextLength: 131072,
    maxCompletionTokens: 131072,
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'OpenAI GPT OSS 20B',
    ownedBy: 'OpenAI',
    contextLength: 131072,
  },
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Qwen 3.8 27B',
    ownedBy: 'Alibaba',
    contextLength: 131072,
  },
];

let cachedCatalog: { data: ModelsCatalog; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

function isTextChatModelId(id: string): boolean {
  const lower = id.toLowerCase();
  if (
    lower.includes('whisper') ||
    lower.includes('orpheus') ||
    lower.includes('guard') ||
    lower.includes('tts') ||
    lower.includes('embed')
  ) {
    return false;
  }
  return true;
}

async function fetchCerebrasModels(): Promise<{ models: ModelInfo[]; live: boolean }> {
  try {
    const hasKey =
      envConfig.cerebrasApiKey.length > 0 &&
      envConfig.cerebrasApiKey !== 'your_cerebras_api_key';

    const url = hasKey
      ? 'https://api.cerebras.ai/v1/models'
      : 'https://api.cerebras.ai/public/v1/models';

    const headers: Record<string, string> = {};
    if (hasKey) {
      headers.Authorization = `Bearer ${envConfig.cerebrasApiKey}`;
    }

    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return { models: FALLBACK_CEREBRAS_MODELS, live: false };
    }

    const json = (await res.json()) as {
      data?: Array<{
        id: string;
        name?: string;
        owned_by?: string;
        deprecated?: boolean;
        limits?: { max_context_length?: number; max_completion_tokens?: number };
      }>;
    };

    const items = (json.data || [])
      .filter((m) => !m.deprecated && isTextChatModelId(m.id))
      .map((m) => ({
        id: m.id,
        name: m.name || m.id,
        ownedBy: m.owned_by || 'Cerebras',
        contextLength: m.limits?.max_context_length,
        maxCompletionTokens: m.limits?.max_completion_tokens,
      }));

    if (items.length === 0) {
      return { models: FALLBACK_CEREBRAS_MODELS, live: false };
    }

    return { models: items, live: true };
  } catch {
    return { models: FALLBACK_CEREBRAS_MODELS, live: false };
  }
}

async function fetchGroqModels(): Promise<{ models: ModelInfo[]; live: boolean }> {
  const hasKey =
    envConfig.groqApiKey.length > 0 && envConfig.groqApiKey !== 'your_groq_api_key';

  if (!hasKey) {
    return { models: FALLBACK_GROQ_MODELS, live: false };
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        Authorization: `Bearer ${envConfig.groqApiKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return { models: FALLBACK_GROQ_MODELS, live: false };
    }

    const json = (await res.json()) as {
      data?: Array<{
        id: string;
        owned_by?: string;
        active?: boolean;
        context_window?: number;
        max_completion_tokens?: number;
      }>;
    };

    const items = (json.data || [])
      .filter((m) => m.active !== false && isTextChatModelId(m.id))
      .map((m) => ({
        id: m.id,
        name: m.id,
        ownedBy: m.owned_by || 'Groq',
        contextLength: m.context_window,
        maxCompletionTokens: m.max_completion_tokens,
      }));

    if (items.length === 0) {
      return { models: FALLBACK_GROQ_MODELS, live: false };
    }

    // Prioritize popular comparison models at the top
    const preferredOrder = [
      'openai/gpt-oss-120b',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-20b',
    ];
    items.sort((a, b) => {
      const idxA = preferredOrder.indexOf(a.id);
      const idxB = preferredOrder.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.id.localeCompare(b.id);
    });

    return { models: items, live: true };
  } catch {
    return { models: FALLBACK_GROQ_MODELS, live: false };
  }
}

export async function getAvailableModels(): Promise<ModelsCatalog> {
  if (cachedCatalog && Date.now() < cachedCatalog.expiresAt) {
    return cachedCatalog.data;
  }

  const [cerebrasRes, groqRes] = await Promise.all([
    fetchCerebrasModels(),
    fetchGroqModels(),
  ]);

  // Ensure configured env defaults are present in dropdowns even if custom
  const ensureModelPresent = (list: ModelInfo[], modelId: string, owner: string) => {
    if (!list.some((m) => m.id === modelId)) {
      return [{ id: modelId, name: modelId, ownedBy: owner }, ...list];
    }
    return list;
  };

  const catalog: ModelsCatalog = {
    cerebras: ensureModelPresent(
      cerebrasRes.models,
      envConfig.defaultCerebrasModel,
      'Configured Default'
    ),
    groq: ensureModelPresent(
      groqRes.models,
      envConfig.defaultGroqModel,
      'Configured Default'
    ),
    source: {
      cerebras: cerebrasRes.live ? 'live_api' : 'fallback_defaults',
      groq: groqRes.live ? 'live_api' : 'fallback_defaults',
    },
  };

  cachedCatalog = {
    data: catalog,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  return catalog;
}
