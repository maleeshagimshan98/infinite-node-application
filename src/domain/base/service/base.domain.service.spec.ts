/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { InfrastructureError } from '@/application/interfaces/errors/infrastructure.error';
import { RepositoryError } from '@/application/interfaces/errors/repository.error';

import { BaseDomainService } from './base.domain.service';
import { DomainServiceError } from './domain-service.error';

class TestDomainService extends BaseDomainService {
  run<T>(fn: () => Promise<T>, onError?: (error: InfrastructureError) => void): Promise<T> {
    return this.wrapInfrastructureErrors(fn, onError);
  }

  checkVersion(version: number, expectedVersion: number | undefined): void {
    this.assertVersion({ version }, expectedVersion, 'Role');
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
    ['VERSION_CONFLICT', 'CONFLICT'],
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

  it('maps a VERSION_CONFLICT RepositoryError to CONFLICT with the fixed reload message', async () => {
    const thrown = await service
      .run(async () => {
        throw new RepositoryError(
          'user.update failed: version 3 of 64b7f0c2a1b2c3d4e5f60719 is stale',
          'VERSION_CONFLICT',
        );
      })
      .catch((e: unknown) => e);

    expect(thrown).toMatchObject({
      type: 'CONFLICT',
      message: 'The record was changed by another request. Reload it and try again.',
    });
  });

  it.each([['DUPLICATE_KEY'], ['VERSION_CONFLICT']] as const)(
    'does not report a %s RepositoryError to onError',
    async (repositoryType) => {
      const onError = jest.fn();

      await service
        .run(async () => {
          throw new RepositoryError(driverMessage, repositoryType);
        }, onError)
        .catch(() => undefined);

      expect(onError).not.toHaveBeenCalled();
    },
  );

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

describe('BaseDomainService.assertVersion', () => {
  const service = new TestDomainService();

  it('passes when the expected version is the current version', () => {
    expect(() => service.checkVersion(3, 3)).not.toThrow();
  });

  it('skips the check when no version is expected', () => {
    expect(() => service.checkVersion(3, undefined)).not.toThrow();
  });

  it.each([[2], [4]])('throws CONFLICT when the caller read version %i of version 3', (expectedVersion) => {
    let thrown: unknown;
    try {
      service.checkVersion(3, expectedVersion);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(DomainServiceError);
    expect(thrown).toMatchObject({ type: 'CONFLICT', message: expect.stringContaining('Role') });
  });
});
