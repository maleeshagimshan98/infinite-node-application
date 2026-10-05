/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';
import { RepositoryError } from '@/infrastructure/core/errors/repository.error';

import { BaseDomainService } from './base.domain.service';
import { DomainServiceError } from './domain-service.error';

class TestDomainService extends BaseDomainService {
  run<T>(fn: () => Promise<T>, onError?: (error: InfrastructureError) => void): Promise<T> {
    return this.wrapInfrastructureErrors(fn, onError);
  }
}

describe('BaseDomainService.wrapInfrastructureErrors', () => {
  const service = new TestDomainService();
  const driverMessage = 'user.create failed: E11000 duplicate key error collection: app.users index: email_1';

  it('resolves with the value returned by the operation', async () => {
    await expect(service.run(async () => 'ok')).resolves.toBe('ok');
  });

  it.each([
    ['DUPLICATE_KEY', 'ALREADY_EXISTS'],
    ['INVALID_ID', 'VALIDATION_ERROR'],
  ] as const)('maps a %s RepositoryError to %s with a client-safe message', async (repositoryType, serviceType) => {
    const thrown = await service
      .run(async () => {
        throw new RepositoryError(driverMessage, repositoryType);
      })
      .catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(DomainServiceError);
    expect(thrown).toMatchObject({ type: serviceType });
    expect(thrown).not.toMatchObject({ message: expect.stringContaining('E11000') });
  });

  it('does not report a RepositoryError to onError', async () => {
    const onError = jest.fn();

    await service
      .run(async () => {
        throw new RepositoryError(driverMessage, 'DUPLICATE_KEY');
      }, onError)
      .catch(() => undefined);

    expect(onError).not.toHaveBeenCalled();
  });

  it('maps an InfrastructureError to INFRASTRUCTURE_ERROR carrying data.type, after calling onError', async () => {
    const error = new InfrastructureError('Mongo down', 'CONNECTION_ERROR');
    const onError = jest.fn();

    const thrown = await service
      .run(async () => {
        throw error;
      }, onError)
      .catch((e: unknown) => e);

    expect(onError).toHaveBeenCalledWith(error);
    expect(thrown).toBeInstanceOf(DomainServiceError);
    expect(thrown).toMatchObject({ type: 'INFRASTRUCTURE_ERROR', data: { type: 'CONNECTION_ERROR' } });
  });

  it.each([
    ['a DomainServiceError', new DomainServiceError('Role x not found', 'NOT_FOUND')],
    ['a programming error', new TypeError('x is undefined')],
  ])('rethrows %s unchanged', async (_label, error) => {
    await expect(
      service.run(async () => {
        throw error;
      }),
    ).rejects.toBe(error);
  });
});
