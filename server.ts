import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { envConfig } from './backend/src/config/env.ts';
import { errorHandler } from './backend/src/middleware/errorHandler.ts';
import { apiRouter } from './backend/src/routes/apiRoutes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));

  // Mount backend API routes
  app.use('/api', apiRouter);

  // Error handling middleware for API routes
  app.use('/api', errorHandler);

  const isProduction = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(__dirname, 'dist');

  if (!isProduction || !fs.existsSync(distDir)) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(envConfig.port, '0.0.0.0', () => {
    console.log(`Cerebras Live AI Speed Challenge server listening on http://0.0.0.0:${envConfig.port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err instanceof Error ? err.message : 'Unknown error');
  process.exit(1);
});
