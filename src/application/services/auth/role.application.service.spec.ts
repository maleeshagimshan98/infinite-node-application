/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Role } from '@/domain/auth/models/role';
import { RoleService } from '@/domain/auth/service/role.service';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import type { IRole } from '@/domain/auth/models/role';
import type { IDatabaseMapper } from '@/application/interfaces';
import type {
  IBaseRepository,
  IVersionedEntity,
} from '@/application/interfaces/repositories/base.repository.interface';
import type { IRoleRepository } from '@/application/interfaces/repositories/auth/role.repository.interface';

import { RoleApplicationService } from './role.application.service';

const ROLE_ID = '65f1a2b3c4d5e6f708192a3b';
const DEFAULT_ROLE_ID = '65f1a2b3c4d5e6f708192a3c';
const SESSION = 'session-1';

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

describe('RoleApplicationService.update', () => {
  let databaseMapper: jest.Mocked<IDatabaseMapper>;
  let roleRepository: jest.Mocked<IRoleRepository>;
  let service: RoleApplicationService;

  beforeEach(() => {
    databaseMapper = {
      serviceName: jest.fn(() => 'database_mapper' as const),
      singleton: jest.fn(() => true as const),
      deferred: jest.fn(() => false as const),
      getDriver: jest.fn(),
      mapper: jest.fn(),
      transaction: jest.fn(),
    };
    databaseMapper.transaction.mockImplementation((callback) => callback({ session: SESSION }));
    roleRepository = mockRepository();
    roleRepository.findById.mockResolvedValue(role());
    roleRepository.findOne.mockResolvedValue(role({ id: DEFAULT_ROLE_ID, version: 7, name: 'Member', default: true }));
    const roleService = new RoleService(roleRepository, mockRepository(), mockRepository());
    service = new RoleApplicationService(databaseMapper, roleService);
  });

  it('switches the default role in one transaction, passing its session to every repository call', async () => {
    roleRepository.update.mockImplementation(async (id, item) =>
      role({ id, default: item.default, version: item.version + 1 }),
    );

    await expect(service.update(ROLE_ID, { default: true, version: 2 })).resolves.toMatchObject({
      id: ROLE_ID,
      default: true,
      version: 3,
    });

    expect(databaseMapper.transaction).toHaveBeenCalledTimes(1);
    expect(roleRepository.findById).toHaveBeenCalledWith(ROLE_ID, { session: SESSION });
    expect(roleRepository.findOne).toHaveBeenCalledWith({ default: true }, undefined, { session: SESSION });
    expect(roleRepository.update.mock.calls.map(([id, item, options]) => [id, item.default, options])).toEqual([
      [DEFAULT_ROLE_ID, false, { session: SESSION }],
      [ROLE_ID, true, { session: SESSION }],
    ]);
  });

  it('lets an error from the second write leave the transaction unchanged, so the transaction aborts', async () => {
    const secondWriteFailure = new DomainServiceError('The role could not be updated.', 'UNKNOWN_ERROR');
    roleRepository.update
      .mockImplementationOnce(async (id, item) => role({ id, default: item.default, version: item.version + 1 }))
      .mockRejectedValueOnce(secondWriteFailure);

    await expect(service.update(ROLE_ID, { default: true, version: 2 })).rejects.toBe(secondWriteFailure);
    expect(databaseMapper.transaction).toHaveBeenCalledTimes(1);
  });
});
