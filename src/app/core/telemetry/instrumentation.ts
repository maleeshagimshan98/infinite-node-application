/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { NodeSDK } from '@opentelemetry/sdk-node';

import { instrumentationConfig } from './otel.config';

// Must be loaded before anything that imports express, mongoose, redis, bullmq, socket.io, winston or axios:
// instrumentation only patches modules required after the SDK starts. Import nothing from the app here.
//
// Exporters, endpoint, service name and sampler all come from OTEL_* env vars (see .env.example).
// OTEL_SDK_DISABLED=true makes the SDK a no-op.
export const otelSdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations(instrumentationConfig())],
});

otelSdk.start();
