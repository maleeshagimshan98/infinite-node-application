/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { UserGroup } from '@/domain/user/models/user-group';
import { UserGroupService } from '@/domain/user/service/user-group.service';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import type { IUserGroup } from '@/domain/user/models/user-group';
import type { IDatabaseMapper } from '@/application/interfaces';
import type {
  IBaseRepository,
  IVersionedEntity,
} from '@/application/interfaces/repositories/base.repository.interface';
import type { IUserGroupRepository } from '@/application/interfaces/repositories/user-groups/user-group.repository.interface';

import { UserGroupApplicationService } from './user-group.application.service';

const GROUP_ID = '65f1a2b3c4d5e6f708192a3b';
const DEFAULT_GROUP_ID = '65f1a2b3c4d5e6f708192a3c';
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
 * Build a user group as the repository returns it.
 *
 * @param {Partial<IUserGroup>} [overrides] - Fields to change from a non-default group at version 2.
 * @returns {UserGroup} The user group.
 */
function group(overrides: Partial<IUserGroup> = {}): UserGroup {
  return new UserGroup({
    id: GROUP_ID,
    version: 2,
    name: 'Gold',
    description: 'Gold members',
    discount: 10,
    default: false,
    ...overrides,
  });
}

describe('UserGroupApplicationService', () => {
  let databaseMapper: jest.Mocked<IDatabaseMapper>;
  let userGroupRepository: jest.Mocked<IUserGroupRepository>;
  let service: UserGroupApplicationService;

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
    userGroupRepository = mockRepository();
    userGroupRepository.findById.mockResolvedValue(group());
    userGroupRepository.findOne.mockResolvedValue(
      group({ id: DEFAULT_GROUP_ID, version: 7, name: 'Standard', default: true }),
    );
    userGroupRepository.update.mockImplementation(async (id, item) =>
      group({ id, name: item.name, default: item.default, version: item.version + 1 }),
    );
    const userGroupService = new UserGroupService(userGroupRepository, mockRepository());
    service = new UserGroupApplicationService(databaseMapper, userGroupService);
  });

  it.each([
    ['update', (): Promise<{ id: string; name: string }> => service.update(GROUP_ID, { default: true, version: 2 })],
    ['setAsDefault', (): Promise<{ id: string; name: string }> => service.setAsDefault(GROUP_ID)],
  ])(
    '%s switches the default group in one transaction, passing its session to every repository call',
    async (_, run) => {
      await expect(run()).resolves.toEqual({ id: GROUP_ID, name: 'Gold' });

      expect(databaseMapper.transaction).toHaveBeenCalledTimes(1);
      expect(userGroupRepository.findById).toHaveBeenCalledWith(GROUP_ID, { session: SESSION });
      expect(userGroupRepository.findOne).toHaveBeenCalledWith({ default: true }, undefined, { session: SESSION });
      expect(userGroupRepository.update.mock.calls.map(([id, item, options]) => [id, item.default, options])).toEqual([
        [DEFAULT_GROUP_ID, false, { session: SESSION }],
        [GROUP_ID, true, { session: SESSION }],
      ]);
    },
  );

  it('lets an error from the second write leave the transaction unchanged, so the transaction aborts', async () => {
    const secondWriteFailure = new DomainServiceError('The group could not be updated.', 'UNKNOWN_ERROR');
    userGroupRepository.update
      .mockImplementationOnce(async (id, item) => group({ id, default: item.default, version: item.version + 1 }))
      .mockRejectedValueOnce(secondWriteFailure);

    await expect(service.setAsDefault(GROUP_ID)).rejects.toBe(secondWriteFailure);
    expect(databaseMapper.transaction).toHaveBeenCalledTimes(1);
  });
});
