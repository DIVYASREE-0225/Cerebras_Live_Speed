import { envConfig } from '../config/env.ts';
import type { ComparisonRequestPayload, ProviderId } from '../types/comparison.ts';

const MODEL_ID_REGEX = /^[a-zA-Z0-9._:/-]{1,128}$/;

export class ValidationError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
  }
}

export function validateComparisonRequest(body: unknown): ComparisonRequestPayload {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a JSON object.');
  }

  const record = body as Record<string, unknown>;
  const rawPrompt = typeof record.prompt === 'string' ? record.prompt.trim() : '';

  if (!rawPrompt) {
    throw new ValidationError('Prompt is required and cannot be empty.');
  }

  if (rawPrompt.length > 16_000) {
    throw new ValidationError('Prompt exceeds the maximum allowed length of 16,000 characters.');
  }

  const cerebrasModel =
    typeof record.cerebrasModel === 'string' && record.cerebrasModel.trim().length > 0
      ? record.cerebrasModel.trim()
      : envConfig.defaultCerebrasModel;

  const groqModel =
    typeof record.groqModel === 'string' && record.groqModel.trim().length > 0
      ? record.groqModel.trim()
      : envConfig.defaultGroqModel;

  if (!MODEL_ID_REGEX.test(cerebrasModel)) {
    throw new ValidationError('Invalid Cerebras model identifier format.');
  }

  if (!MODEL_ID_REGEX.test(groqModel)) {
    throw new ValidationError('Invalid Groq model identifier format.');
  }

  let maxTokens = 1024;
  if (record.maxTokens !== undefined) {
    const parsedMax = Number(record.maxTokens);
    if (!Number.isInteger(parsedMax) || parsedMax < 32 || parsedMax > 8192) {
      throw new ValidationError('maxTokens must be an integer between 32 and 8192.');
    }
    maxTokens = parsedMax;
  }

  let temperature = 0.7;
  if (record.temperature !== undefined) {
    const parsedTemp = Number(record.temperature);
    if (!Number.isFinite(parsedTemp) || parsedTemp < 0 || parsedTemp > 2) {
      throw new ValidationError('temperature must be a number between 0 and 2.');
    }
    temperature = Math.round(parsedTemp * 100) / 100;
  }

  let prediction: ProviderId | null = null;
  if (record.prediction === 'cerebras' || record.prediction === 'groq') {
    prediction = record.prediction;
  } else if (record.prediction !== undefined && record.prediction !== null && record.prediction !== '') {
    throw new ValidationError('prediction must be "cerebras", "groq", or null.');
  }

  const roundIndex =
    typeof record.roundIndex === 'number' && Number.isInteger(record.roundIndex) && record.roundIndex >= 1
      ? record.roundIndex
      : undefined;

  const totalRounds =
    typeof record.totalRounds === 'number' && Number.isInteger(record.totalRounds) && record.totalRounds >= 1
      ? record.totalRounds
      : undefined;

  return {
    prompt: rawPrompt,
    cerebrasModel,
    groqModel,
    maxTokens,
    temperature,
    prediction,
    roundIndex,
    totalRounds,
  };
}

export type VoteOption = 'cerebras' | 'groq' | 'equal';

export function validateVoteRequest(body: unknown): { vote: VoteOption; comparisonId?: string } {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a JSON object.');
  }

  const record = body as Record<string, unknown>;
  const vote = record.vote;

  if (vote !== 'cerebras' && vote !== 'groq' && vote !== 'equal') {
    throw new ValidationError('Vote option must be "cerebras", "groq", or "equal".');
  }

  const comparisonId =
    typeof record.comparisonId === 'string' && record.comparisonId.trim().length > 0
      ? record.comparisonId.trim().slice(0, 64)
      : undefined;

  return { vote, comparisonId };
}
