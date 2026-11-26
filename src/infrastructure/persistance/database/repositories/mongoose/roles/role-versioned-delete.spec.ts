/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 *
 * Integration test for the versioned delete of a role, against a real MongoDB database of its own: a role made the
 * default between RoleService.delete()'s checks and its delete must not be deleted.
 *
 * NOTE: Ensure MongoDB is running and use a dedicated test database!
 */

import { NewRole } from '@/domain/auth/models/role';
import { RoleService } from '@/domain/auth/service/role.service';

import {
  connectToTestDB,
  clearTestDB,
  disconnectFromTestDB,
  dropTestDB,
} from '../base/test-helpers/mongodb-test-helper';
import { ResourceRepository } from '../resources/resource.repository';
import { UserRepository } from '../user/user.repository';
import { RoleModel } from './role.model';
import { RoleRepository } from './role.repository';

describe('Deleting a role at the version it was read', () => {
  let roleRepository: RoleRepository;
  let userRepository: UserRepository;
  let roleService: RoleService;

  beforeAll(async () => {
    await connectToTestDB('infinite-node-application-test-role-versioned-delete');
    await RoleModel.init();
  });

  beforeEach(async () => {
    await clearTestDB();
    roleRepository = new RoleRepository();
    userRepository = new UserRepository();
    roleService = new RoleService(roleRepository, new ResourceRepository(), userRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await dropTestDB();
    await disconnectFromTestDB();
  });

  it('does not delete a role made the default after the checks passed', async () => {
    const role = await roleRepository.create(new NewRole({ name: 'Editor', default: false, resource_permissions: [] }));
    // Between the "not the default" check and the delete, another request makes the role the default.
    const find = userRepository.find.bind(userRepository);
    jest.spyOn(userRepository, 'find').mockImplementation(async (...args) => {
      const concurrent = await roleRepository.findById(role.id);
      if (concurrent) {
        concurrent.default = true;
        await roleRepository.update(concurrent.id, concurrent);
      }
      return find(...args);
    });

    await expect(roleService.delete(role.id, role.version)).rejects.toMatchObject({ type: 'CONFLICT' });

    const stored = await roleRepository.findById(role.id);
    expect(stored?.default).toBe(true);
    expect(stored?.version).toBe(1);
  });

  it('rejects a client version that is no longer current, before any check', async () => {
    const role = await roleRepository.create(new NewRole({ name: 'Editor', default: false, resource_permissions: [] }));
    role.description = 'changed by another request';
    await roleRepository.update(role.id, role);

    await expect(roleService.delete(role.id, 0)).rejects.toMatchObject({ type: 'CONFLICT' });
    expect(await roleRepository.findById(role.id)).not.toBeNull();
  });

  it('deletes the role at its current version', async () => {
    const role = await roleRepository.create(new NewRole({ name: 'Editor', default: false, resource_permissions: [] }));

    await expect(roleService.delete(role.id, role.version)).resolves.toMatchObject({ id: role.id });
    expect(await roleRepository.findById(role.id)).toBeNull();
  });
});
