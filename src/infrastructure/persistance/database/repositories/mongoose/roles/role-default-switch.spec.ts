/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 *
 * Integration test for switching the default role inside a transaction, against a real MongoDB database of its own.
 * Transactions need a replica set; against a standalone server the tests return early.
 *
 * NOTE: Ensure MongoDB is running and use a dedicated test database!
 */

import mongoose from 'mongoose';

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

describe('Switching the default role in a transaction', () => {
  let replicaSet = false;
  let roleRepository: RoleRepository;
  let roleService: RoleService;

  beforeAll(async () => {
    await connectToTestDB('infinite-node-application-test-role-default-switch');
    await RoleModel.init();
    const hello = await mongoose.connection.db?.admin().command({ hello: 1 });
    replicaSet = typeof hello?.setName === 'string';
  });

  beforeEach(async () => {
    await clearTestDB();
    roleRepository = new RoleRepository();
    roleService = new RoleService(roleRepository, new ResourceRepository(), new UserRepository());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await dropTestDB();
    await disconnectFromTestDB();
  });

  it('keeps the old default when the second write fails (replica set only)', async () => {
    if (!replicaSet) {
      return;
    }
    const oldDefault = await roleRepository.create(
      new NewRole({ name: 'Member', default: true, resource_permissions: [] }),
    );
    const role = await roleRepository.create(new NewRole({ name: 'Editor', default: false, resource_permissions: [] }));
    const update = roleRepository.update.bind(roleRepository);
    const crash = new Error('crash between the two writes');
    jest
      .spyOn(roleRepository, 'update')
      .mockImplementationOnce(async (id, item, options) => await update(id, item, options))
      .mockRejectedValueOnce(crash);

    const thrown = await mongoose.connection
      .transaction(async (session) => await roleService.update(role.id, { default: true }, { session }))
      .catch((e: unknown) => e);

    expect(thrown).toBe(crash);
    await expect(roleRepository.findById(oldDefault.id)).resolves.toMatchObject({ default: true, version: 0 });
    await expect(roleRepository.findById(role.id)).resolves.toMatchObject({ default: false, version: 0 });
  });

  it('leaves exactly one default after a successful switch (replica set only)', async () => {
    if (!replicaSet) {
      return;
    }
    const oldDefault = await roleRepository.create(
      new NewRole({ name: 'Member', default: true, resource_permissions: [] }),
    );
    const role = await roleRepository.create(new NewRole({ name: 'Editor', default: false, resource_permissions: [] }));

    await mongoose.connection.transaction(
      async (session) => await roleService.update(role.id, { default: true, version: role.version }, { session }),
    );

    await expect(RoleModel.countDocuments({ default: true })).resolves.toBe(1);
    await expect(roleRepository.findById(role.id)).resolves.toMatchObject({ default: true, version: 1 });
    await expect(roleRepository.findById(oldDefault.id)).resolves.toMatchObject({ default: false, version: 1 });
  });
});
