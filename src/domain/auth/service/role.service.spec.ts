/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Role } from '@/domain/auth/models/role';
import { Resource } from '@/domain/auth/models/resource';
import type { IRole, INewResourcePermission } from '@/domain/auth/models/role';
import type {
  IBaseRepository,
  IVersionedEntity,
} from '@/application/interfaces/repositories/base.repository.interface';
import type { IRoleRepository } from '@/application/interfaces/repositories/auth/role.repository.interface';
import type { IResourceRepository } from '@/application/interfaces/repositories/auth/resource.repository.interface';
import type { IUserRepository } from '@/application/interfaces/repositories/user/user.repository.interface';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import { RepositoryError } from '@/application/interfaces/errors/repository.error';

import { RoleService } from './role.service';

const ROLE_ID = '65f1a2b3c4d5e6f708192a3b';
const DEFAULT_ROLE_ID = '65f1a2b3c4d5e6f708192a3c';

/**
 * Build a mocked repository with every base method stubbed.
 *
 * @returns {jest.Mocked<IBaseRepository<D, N>>} The mocked repository.
 */
function mockRepository<D extends IVersionedEntity, N>(): jest.Mocked<IBaseRepository<D, N>> {
  return {
    create: jest.fn(),
    bulkCreate: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

/**
 * Build a role as the repository returns it.
 *
 * @param {Partial<IRole>} [overrides] - Fields to change from a non-default role at version 2.
 * @returns {Role} The role.
 */
function role(overrides: Partial<IRole> = {}): Role {
  return new Role({ id: ROLE_ID, version: 2, name: 'Editor', default: false, resource_permissions: [], ...overrides });
}

describe('RoleService.update', () => {
  let roleRepository: jest.Mocked<IRoleRepository>;
  let resourceRepository: jest.Mocked<IResourceRepository>;
  let service: RoleService;

  beforeEach(() => {
    roleRepository = mockRepository();
    resourceRepository = mockRepository();
    const userRepository: jest.Mocked<IUserRepository> = mockRepository();
    service = new RoleService(roleRepository, resourceRepository, userRepository);
  });

  it('rejects a stale version with CONFLICT before any write, so the old default stays set', async () => {
    roleRepository.findById.mockResolvedValue(role());
    roleRepository.findOne.mockResolvedValue(role({ id: DEFAULT_ROLE_ID, name: 'Member', default: true }));

    const thrown = await service.update(ROLE_ID, { default: true, version: 1 }).catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(DomainServiceError);
    expect(thrown).toMatchObject({ type: 'CONFLICT' });
    expect(roleRepository.update).not.toHaveBeenCalled();
  });

  it('updates with the version the client read, without assigning it to the role', async () => {
    roleRepository.findById.mockResolvedValue(role());
    roleRepository.update.mockImplementation(async (_id, item) =>
      role({ name: item.name, default: item.default, version: item.version + 1 }),
    );

    const updated = await service.update(ROLE_ID, { name: 'Publisher', version: 2 });

    expect(updated).toMatchObject({ name: 'Publisher', version: 3 });
    expect(roleRepository.update).toHaveBeenCalledWith(
      ROLE_ID,
      expect.objectContaining({ name: 'Publisher', version: 2 }),
      undefined,
    );
  });

  it('applies an update without a version to the role as it was just read', async () => {
    roleRepository.findById.mockResolvedValue(role());
    roleRepository.update.mockImplementation(async (_id, item) => role({ name: item.name, version: 3 }));

    await expect(service.update(ROLE_ID, { name: 'Publisher' })).resolves.toMatchObject({ version: 3 });
  });

  it('unsets the old default before setting the new one, each with the version it was read at', async () => {
    roleRepository.findById.mockResolvedValue(role());
    roleRepository.findOne.mockResolvedValue(role({ id: DEFAULT_ROLE_ID, version: 7, name: 'Member', default: true }));
    roleRepository.update.mockImplementation(async (id, item) =>
      role({ id, name: item.name, default: item.default, version: item.version + 1 }),
    );

    await service.update(ROLE_ID, { default: true, version: 2 });

    expect(roleRepository.update.mock.calls.map(([id, item]) => [id, item.default, item.version])).toEqual([
      [DEFAULT_ROLE_ID, false, 7],
      [ROLE_ID, true, 2],
    ]);
  });

  it('refuses to unset the default role with INVALID_OPERATION, before any write', async () => {
    roleRepository.findById.mockResolvedValue(role({ default: true }));

    await expect(service.update(ROLE_ID, { default: false, version: 2 })).rejects.toMatchObject({
      name: 'DomainServiceError',
      type: 'INVALID_OPERATION',
    });
    expect(roleRepository.update).not.toHaveBeenCalled();
  });

  it('accepts default: false on a role that is not the default', async () => {
    roleRepository.findById.mockResolvedValue(role());
    roleRepository.update.mockImplementation(async (_id, item) =>
      role({ default: item.default, version: item.version + 1 }),
    );

    await expect(service.update(ROLE_ID, { default: false, version: 2 })).resolves.toMatchObject({
      default: false,
      version: 3,
    });
    expect(roleRepository.findOne).not.toHaveBeenCalled();
  });

  it('looks up each granted resource one at a time, in the caller transaction', async () => {
    const transactionOptions = { session: 'session-1' };
    const entries: INewResourcePermission[] = ['65f1a2b3c4d5e6f708192a40', '65f1a2b3c4d5e6f708192a41'].map(
      (resource_id) => ({ resource_id, permission: { read: true, write: false, update: false, delete: false } }),
    );
    let inFlight = 0;
    let maxInFlight = 0;
    resourceRepository.findById.mockImplementation(async (id) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return new Resource({ id, version: 0, name: `resource-${id}` });
    });
    roleRepository.findById.mockResolvedValue(role());
    roleRepository.update.mockImplementation(async (_id, item) => role({ version: item.version + 1 }));

    await service.update(ROLE_ID, { resource_permissions: entries, version: 2 }, transactionOptions);

    expect(resourceRepository.findById.mock.calls).toEqual(
      entries.map((entry) => [entry.resource_id, transactionOptions]),
    );
    expect(maxInFlight).toBe(1);
  });

  it('turns a VERSION_CONFLICT from the repository (a concurrent write) into CONFLICT', async () => {
    roleRepository.findById.mockResolvedValue(role());
    roleRepository.update.mockRejectedValue(
      new RepositoryError(`role.update failed: version 2 of ${ROLE_ID} is stale`, 'VERSION_CONFLICT'),
    );

    await expect(service.update(ROLE_ID, { name: 'Publisher', version: 2 })).rejects.toMatchObject({
      type: 'CONFLICT',
      message: 'The record was changed by another request. Reload it and try again.',
    });
  });
});
