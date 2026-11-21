import dotenv from 'dotenv';

dotenv.config();

export interface SafeEnvConfig {
  cerebrasConfigured: boolean;
  groqConfigured: boolean;
  defaultCerebrasModel: string;
  defaultGroqModel: string;
}

export const envConfig = {
  port: Number(process.env.PORT) || 3000,
  cerebrasApiKey: (process.env.CEREBRAS_API_KEY || '').trim(),
  groqApiKey: (process.env.GROQ_API_KEY || '').trim(),
  defaultCerebrasModel: (process.env.CEREBRAS_MODEL || 'gpt-oss-120b').trim(),
  defaultGroqModel: (process.env.GROQ_MODEL || 'openai/gpt-oss-120b').trim(),
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS) || 60_000,
} as const;

export function getSafeConfigStatus(): SafeEnvConfig {
  return {
    cerebrasConfigured: envConfig.cerebrasApiKey.length > 0 && envConfig.cerebrasApiKey !== 'your_cerebras_api_key',
    groqConfigured: envConfig.groqApiKey.length > 0 && envConfig.groqApiKey !== 'your_groq_api_key',
    defaultCerebrasModel: envConfig.defaultCerebrasModel,
    defaultGroqModel: envConfig.defaultGroqModel,
  };
}
