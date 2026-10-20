/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IncomingMessage } from 'http';
import type { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

export type AutoInstrumentationConfig = NonNullable<Parameters<typeof getNodeAutoInstrumentations>[0]>;

// `^[^?]*` keeps the match in the path, so `/users?q=/health` is not a health probe
const HEALTH_CHECK_PATH = /^[^?]*\/health(\/live|\/ready)?\/?(\?.*)?$/;

/**
 * Tell whether a request URL is one of the health probes, which are not traced.
 *
 * @param {string | undefined} url - The raw request URL, including any query string.
 * @returns {boolean} True for `/health`, `/health/live` and `/health/ready` under any prefix.
 */
export function isHealthCheckRequest(url: string | undefined): boolean {
  return url !== undefined && HEALTH_CHECK_PATH.test(url);
}

/**
 * Build the per-instrumentation overrides for `getNodeAutoInstrumentations()`.
 *
 * @returns {AutoInstrumentationConfig} Overrides; instrumentations not listed keep their defaults.
 */
export function instrumentationConfig(): AutoInstrumentationConfig {
  return {
    // fs: a span per log-file write; net/dns: duplicate what the http, mongodb and redis spans already show
    '@opentelemetry/instrumentation-fs': { enabled: false },
    '@opentelemetry/instrumentation-net': { enabled: false },
    '@opentelemetry/instrumentation-dns': { enabled: false },
    '@opentelemetry/instrumentation-http': {
      ignoreIncomingRequestHook: (req: IncomingMessage): boolean => isHealthCheckRequest(req.url),
    },
  };
}
