/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Role } from '@/domain/auth/models/role';
import { User } from '@/domain/user/models/user';
import { UserGroup } from '@/domain/user/models/user-group';
import type {
  IBaseRepository,
  IVersionedEntity,
} from '@/application/interfaces/repositories/base.repository.interface';
import type { IRoleRepository } from '@/application/interfaces/repositories/auth/role.repository.interface';
import type { IUserGroupRepository } from '@/application/interfaces/repositories/user-groups/user-group.repository.interface';
import type { IUserRepository } from '@/application/interfaces/repositories/user/user.repository.interface';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';

import { UserService } from './user.service';

const USER_ID = '65f1a2b3c4d5e6f708192a3b';

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
 * Build the stored user, at version 4.
 *
 * @returns {User} The user.
 */
function storedUser(): User {
  return new User({
    id: USER_ID,
    version: 4,
    email: 'jane@example.com',
    password: 'hash',
    status: 'active',
    ug_id: 'group-1',
    role_id: 'role-1',
  });
}

describe('UserService', () => {
  let userRepository: jest.Mocked<IUserRepository>;
  let service: UserService;

  beforeEach(() => {
    userRepository = mockRepository();
    const roleRepository: jest.Mocked<IRoleRepository> = mockRepository();
    const userGroupRepository: jest.Mocked<IUserGroupRepository> = mockRepository();
    roleRepository.findById.mockResolvedValue(
      new Role({ id: 'role-1', version: 0, name: 'Member', default: true, resource_permissions: [] }),
    );
    userGroupRepository.findById.mockResolvedValue(
      new UserGroup({ id: 'group-1', version: 0, name: 'Default', description: '', discount: 0, default: true }),
    );
    service = new UserService(userRepository, roleRepository, userGroupRepository);
  });

  it('looks a user up by the trimmed, lowercase email', async () => {
    await service.getByEmail('  Jane@Example.COM ');

    expect(userRepository.findOne).toHaveBeenCalledWith({ email: 'jane@example.com' }, undefined, undefined);
  });

  it('rejects an update made from a stale version with CONFLICT, without writing', async () => {
    userRepository.findById.mockResolvedValue(storedUser());

    const thrown = await service.update(USER_ID, { status: 'suspended', version: 3 }).catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(DomainServiceError);
    expect(thrown).toMatchObject({ type: 'CONFLICT' });
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('treats an email that differs only in case as unchanged, so it is no duplicate of itself', async () => {
    userRepository.findById.mockResolvedValue(storedUser());
    userRepository.update.mockImplementation(async (_id, item) => item);

    const updated = await service.update(USER_ID, { email: 'JANE@example.com', version: 4 });

    expect(userRepository.findOne).not.toHaveBeenCalled();
    expect(updated.email).toBe('jane@example.com');
  });
});
