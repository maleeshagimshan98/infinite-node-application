/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 *
 * Integration test for a versioned update inside a transaction, against a real MongoDB database of its own.
 * Transactions need a replica set; against a standalone server the test returns early.
 *
 * NOTE: Ensure MongoDB is running and use a dedicated test database!
 */

import mongoose from 'mongoose';

import { NewRole } from '@/domain/auth/models/role';
import { RoleService } from '@/domain/auth/service/role.service';

import { ResourceRepository } from '../resources/resource.repository';
import { RoleModel } from '../roles/role.model';
import { RoleRepository } from '../roles/role.repository';
import { UserRepository } from '../user/user.repository';
import { connectToTestDB, disconnectFromTestDB, dropTestDB } from './test-helpers/mongodb-test-helper';

describe('A versioned update in a transaction', () => {
  let replicaSet = false;

  beforeAll(async () => {
    await connectToTestDB('infinite-node-application-test-versioned-transaction');
    await RoleModel.init();
    const hello = await mongoose.connection.db?.admin().command({ hello: 1 });
    replicaSet = typeof hello?.setName === 'string';
  });

  afterAll(async () => {
    await dropTestDB();
    await disconnectFromTestDB();
  });

  it('re-runs the callback after a concurrent commit, and the re-run fails the client version check (replica set only)', async () => {
    if (!replicaSet) {
      return;
    }
    const roleRepository = new RoleRepository();
    const roleService = new RoleService(roleRepository, new ResourceRepository(), new UserRepository());
    const role = await roleRepository.create(new NewRole({ name: 'Editor', default: false, resource_permissions: [] }));
    const versionTheClientRead = role.version;
    let attempts = 0;

    const thrown = await mongoose.connection
      .transaction(async (session) => {
        attempts += 1;
        // Fix the transaction's snapshot with a first read, then let another request commit a change to the role.
        await RoleModel.countDocuments().session(session);
        if (attempts === 1) {
          const concurrent = await roleRepository.findById(role.id);
          if (concurrent) {
            concurrent.description = 'changed by another request';
            await roleRepository.update(concurrent.id, concurrent);
          }
        }
        // First run: the snapshot still holds the old version, so the check passes and the write conflicts
        // (TransientTransactionError), which withTransaction retries. Second run: the role is at a newer version.
        await roleService.update(role.id, { name: 'Publisher', version: versionTheClientRead }, { session });
      })
      .catch((e: unknown) => e);

    expect(attempts).toBe(2);
    expect(thrown).toMatchObject({ name: 'DomainServiceError', type: 'CONFLICT' });
    const stored = await roleRepository.findById(role.id);
    expect(stored).toMatchObject({ name: 'Editor', description: 'changed by another request', version: 1 });
  });
});
