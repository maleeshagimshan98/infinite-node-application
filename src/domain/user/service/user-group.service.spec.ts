/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { UserGroup } from '@/domain/user/models/user-group';
import type { IUserGroup } from '@/domain/user/models/user-group';
import type {
  IBaseRepository,
  IVersionedEntity,
} from '@/application/interfaces/repositories/base.repository.interface';
import type { IUserGroupRepository } from '@/application/interfaces/repositories/user-groups/user-group.repository.interface';
import type { IUserRepository } from '@/application/interfaces/repositories/user/user.repository.interface';

import { UserGroupService } from './user-group.service';

const GROUP_ID = '65f1a2b3c4d5e6f708192a3b';
const DEFAULT_GROUP_ID = '65f1a2b3c4d5e6f708192a3c';

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

describe('UserGroupService', () => {
  let userGroupRepository: jest.Mocked<IUserGroupRepository>;
  let service: UserGroupService;

  beforeEach(() => {
    userGroupRepository = mockRepository();
    const userRepository: jest.Mocked<IUserRepository> = mockRepository();
    service = new UserGroupService(userGroupRepository, userRepository);
    userGroupRepository.update.mockImplementation(async (id, item) =>
      group({ id, name: item.name, default: item.default, version: item.version + 1 }),
    );
  });

  describe('update', () => {
    it('refuses to unset the default group with INVALID_OPERATION, before any write', async () => {
      userGroupRepository.findById.mockResolvedValue(group({ default: true }));

      await expect(service.update(GROUP_ID, { default: false, version: 2 })).rejects.toMatchObject({
        name: 'DomainServiceError',
        type: 'INVALID_OPERATION',
      });
      expect(userGroupRepository.update).not.toHaveBeenCalled();
    });

    it('accepts default: false on a group that is not the default', async () => {
      userGroupRepository.findById.mockResolvedValue(group());

      await expect(service.update(GROUP_ID, { default: false, version: 2 })).resolves.toEqual({
        id: GROUP_ID,
        name: 'Gold',
      });
    });

    it('unsets the old default before setting the new one, each with the version it was read at and the session', async () => {
      const transactionOptions = { session: 'session-1' };
      userGroupRepository.findById.mockResolvedValue(group());
      userGroupRepository.findOne.mockResolvedValue(
        group({ id: DEFAULT_GROUP_ID, version: 7, name: 'Standard', default: true }),
      );

      await service.update(GROUP_ID, { default: true, version: 2 }, transactionOptions);

      expect(
        userGroupRepository.update.mock.calls.map(([id, item, options]) => [id, item.default, item.version, options]),
      ).toEqual([
        [DEFAULT_GROUP_ID, false, 7, transactionOptions],
        [GROUP_ID, true, 2, transactionOptions],
      ]);
    });
  });

  describe('setAsDefault', () => {
    it('unsets the old default before setting the new one, in the caller transaction', async () => {
      const transactionOptions = { session: 'session-1' };
      userGroupRepository.findById.mockResolvedValue(group());
      userGroupRepository.findOne.mockResolvedValue(
        group({ id: DEFAULT_GROUP_ID, version: 7, name: 'Standard', default: true }),
      );

      await service.setAsDefault(GROUP_ID, transactionOptions);

      expect(
        userGroupRepository.update.mock.calls.map(([id, item, options]) => [id, item.default, item.version, options]),
      ).toEqual([
        [DEFAULT_GROUP_ID, false, 7, transactionOptions],
        [GROUP_ID, true, 2, transactionOptions],
      ]);
    });

    it('writes nothing when the group is already the default', async () => {
      userGroupRepository.findById.mockResolvedValue(group({ default: true }));

      await expect(service.setAsDefault(GROUP_ID)).resolves.toEqual({ id: GROUP_ID, name: 'Gold' });
      expect(userGroupRepository.update).not.toHaveBeenCalled();
    });
  });
});
