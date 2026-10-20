/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { BullMQOtel } from 'bullmq-otel';

// Shared by every Queue and Worker: carries the trace context from the code that adds a job to the worker
// that processes it, and records job counts and durations. Pass it as `telemetry` to every new Queue / Worker.
// Created at import time, after src/app/core/telemetry/instrumentation.ts has started the SDK — with the SDK
// disabled it falls back to OpenTelemetry's no-op tracer and meter.
export const bullmqTelemetry = new BullMQOtel({ enableMetrics: true });
