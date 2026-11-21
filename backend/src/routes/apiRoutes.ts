import { Router } from 'express';
import { getSafeConfigStatus } from '../config/env.ts';
import { runConcurrentComparison } from '../services/comparisonService.ts';
import { getAvailableModels } from '../services/modelsService.ts';
import { sessionStore } from '../services/sessionStore.ts';
import { validateComparisonRequest, validateVoteRequest } from '../utils/validation.ts';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  const config = getSafeConfigStatus();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    providers: {
      cerebras: {
        configured: config.cerebrasConfigured,
        defaultModel: config.defaultCerebrasModel,
      },
      groq: {
        configured: config.groqConfigured,
        defaultModel: config.defaultGroqModel,
      },
    },
  });
});

apiRouter.get('/models', async (_req, res, next) => {
  try {
    const config = getSafeConfigStatus();
    const catalog = await getAvailableModels();
    res.json({
      defaults: {
        cerebras: config.defaultCerebrasModel,
        groq: config.defaultGroqModel,
      },
      configured: {
        cerebras: config.cerebrasConfigured,
        groq: config.groqConfigured,
      },
      models: {
        cerebras: catalog.cerebras,
        groq: catalog.groq,
      },
      source: catalog.source,
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/compare', async (req, res, next) => {
  let payload;
  try {
    payload = validateComparisonRequest(req.body);
  } catch (err) {
    next(err);
    return;
  }

  // Configure Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const abortController = new AbortController();
  const handleDisconnect = () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  };
  res.on('close', handleDisconnect);

  try {
    await runConcurrentComparison(payload, res, abortController);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected comparison failure.';
    if (!res.writableEnded && !res.destroyed) {
      res.write(`event: comparison_error\ndata: ${JSON.stringify({ error: msg })}\n\n`);
    }
  } finally {
    res.off('close', handleDisconnect);
    if (!res.writableEnded) {
      res.end();
    }
  }
});

apiRouter.post('/vote', (req, res, next) => {
  try {
    const { vote } = validateVoteRequest(req.body);
    const votes = sessionStore.recordVote(vote);
    res.json({
      success: true,
      votes,
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/results', (_req, res) => {
  res.json(sessionStore.getResults());
});

apiRouter.post('/results/reset', (_req, res) => {
  res.json(sessionStore.resetSession());
});
