/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import path from 'path';

import dotenv from 'dotenv';

// Imported first by every entry point: the OpenTelemetry SDK reads its OTEL_* variables when it starts,
// before app.ts / worker.ts are loaded. In production the launcher (Docker env_file, PM2) injects them.
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({
    path: path.resolve(__dirname, `../../../../.env.${process.env.NODE_ENV}`),
    override: false,
  });
}
