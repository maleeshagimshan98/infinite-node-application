/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { instrumentationConfig, isHealthCheckRequest } from './otel.config';

describe('isHealthCheckRequest', () => {
  test.each(['/api/v1/health', '/api/v1/health/', '/api/v1/health/live', '/api/v1/health/ready?verbose=1'])(
    'returns true for %s',
    (url) => {
      expect(isHealthCheckRequest(url)).toBe(true);
    },
  );

  test.each(['/api/v1/users', '/api/v1/healthcheck-records', '/api/v1/health/live/extra', '/api/v1/users?q=/health'])(
    'returns false for %s',
    (url) => {
      expect(isHealthCheckRequest(url)).toBe(false);
    },
  );

  test('returns false when the url is undefined', () => {
    expect(isHealthCheckRequest(undefined)).toBe(false);
  });
});

describe('instrumentationConfig', () => {
  test('disables the fs, net and dns instrumentations', () => {
    const config = instrumentationConfig();
    expect(config['@opentelemetry/instrumentation-fs']).toEqual({ enabled: false });
    expect(config['@opentelemetry/instrumentation-net']).toEqual({ enabled: false });
    expect(config['@opentelemetry/instrumentation-dns']).toEqual({ enabled: false });
  });

  test('configures the http instrumentation to ignore incoming health probes', () => {
    const httpConfig = instrumentationConfig()['@opentelemetry/instrumentation-http'];
    expect(typeof httpConfig?.ignoreIncomingRequestHook).toBe('function');
  });
});
