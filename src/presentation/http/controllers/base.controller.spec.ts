/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { APIResponse } from '@/app/core/utils/api-response/api-response';
import { ErrorResponseMessages } from '@/app/core/utils/error-response-messages';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

import { BaseController } from './base.controller';

class TestController extends BaseController {
  run(error: unknown): Promise<APIResponse> {
    return this.catchExceptionsWrapper(async () => {
      throw error;
    });
  }
}

const RAW_DRIVER_MESSAGE =
  'E11000 duplicate key error collection: app.users index: email_1 dup key: { email: "a@b.c" }';

describe('BaseController error responses', () => {
  const controller = new TestController();

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a generic 500 for an InfrastructureError without exposing its message', async () => {
    const response = await controller.run(new InfrastructureError(RAW_DRIVER_MESSAGE, 'DATABASE_ERROR'));

    expect(response.getCode()).toBe(500);
    expect(response.getMessage()).toBe(ErrorResponseMessages.SERVER_ERROR());
    expect(response.toJson()).not.toContain('E11000');
  });

  it('returns a generic 503 for a connection InfrastructureError', async () => {
    const response = await controller.run(
      new InfrastructureError('connect ECONNREFUSED 10.0.0.5:27017', 'CONNECTION_ERROR'),
    );

    expect(response.getCode()).toBe(503);
    expect(response.getMessage()).toBe(ErrorResponseMessages.SERVICE_UNAVAILABLE());
    expect(response.toJson()).not.toContain('10.0.0.5');
  });

  it('returns a generic 503 for an INFRASTRUCTURE_ERROR DomainServiceError of network type', async () => {
    const response = await controller.run(
      new DomainServiceError(RAW_DRIVER_MESSAGE, 'INFRASTRUCTURE_ERROR', { type: 'NETWORK_ERROR' }),
    );

    expect(response.getCode()).toBe(503);
    expect(response.getMessage()).toBe(ErrorResponseMessages.SERVICE_UNAVAILABLE());
    expect(response.toJson()).not.toContain('E11000');
  });

  it('returns a generic 500 for an INFRASTRUCTURE_ERROR DomainServiceError of database type', async () => {
    const response = await controller.run(
      new DomainServiceError(RAW_DRIVER_MESSAGE, 'INFRASTRUCTURE_ERROR', { type: 'DATABASE_ERROR' }),
    );

    expect(response.getCode()).toBe(500);
    expect(response.getMessage()).toBe(ErrorResponseMessages.SERVER_ERROR());
    expect(response.toJson()).not.toContain('E11000');
  });

  it('keeps the domain-authored message for other DomainServiceError types', async () => {
    const response = await controller.run(new DomainServiceError('Role x not found', 'NOT_FOUND'));

    expect(response.getCode()).toBe(404);
    expect(response.getMessage()).toBe('Role x not found');
  });
});
