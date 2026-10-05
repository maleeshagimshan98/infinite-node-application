/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 *
 * Unit tests for BaseRepository.wrapDatabaseErrors — no database connection needed.
 */

import mongoose from 'mongoose';

import { DomainEntityError } from '@/domain/base/DomainEntityError';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';
import { RepositoryError } from '@/infrastructure/core/errors/repository.error';

import { PersistanceError } from '../../../errors/persistance.error';
import { UserModel } from '../user/user.model';
import { UserRepository } from '../user/user.repository';
import { restoreReadyState, stubReadyState } from './test-helpers/connection-state.helper';

class TestUserRepository extends UserRepository {
  run<T>(fn: () => Promise<T>): Promise<T> {
    return this.wrapDatabaseErrors('test', fn);
  }
}

/**
 * Run an operation through the wrapper and return what it threw.
 *
 * @param {TestUserRepository} repository - The repository exposing the wrapper.
 * @param {unknown} error - The value the wrapped operation throws.
 * @returns {Promise<unknown>} The value the wrapper threw.
 */
async function thrownBy(repository: TestUserRepository, error: unknown): Promise<unknown> {
  return repository
    .run(async () => {
      throw error;
    })
    .catch((e: unknown) => e);
}

describe('BaseRepository.wrapDatabaseErrors', () => {
  let repository: TestUserRepository;

  beforeEach(() => {
    repository = new TestUserRepository();
  });

  afterEach(() => {
    restoreReadyState(UserModel.db);
  });

  it('resolves with the value returned by the operation', async () => {
    await expect(repository.run(async () => 'ok')).resolves.toBe('ok');
  });

  it.each([['TransientTransactionError'], ['UnknownTransactionCommitResult']])(
    'rethrows a MongoError labelled %s unchanged so withTransaction can retry',
    async (label) => {
      const error = new mongoose.mongo.MongoServerError({ message: 'WriteConflict', code: 112 });
      error.addErrorLabel(label);

      await expect(thrownBy(repository, error)).resolves.toBe(error);
    },
  );

  it.each([
    ['a DomainEntityError', new DomainEntityError('Invalid email')],
    ['a programming error', new TypeError('x is undefined')],
  ])('rethrows %s unchanged', async (_label, error) => {
    await expect(thrownBy(repository, error)).resolves.toBe(error);
  });

  it('translates a duplicate key error into a DUPLICATE_KEY RepositoryError carrying the original', async () => {
    const error = new mongoose.mongo.MongoServerError({ message: 'E11000 duplicate key error', code: 11000 });

    const thrown = await thrownBy(repository, error);

    expect(thrown).toBeInstanceOf(RepositoryError);
    expect(thrown).toMatchObject({ type: 'DUPLICATE_KEY', data: { cause: error } });
  });

  it('translates a network error into a CONNECTION_ERROR InfrastructureError', async () => {
    const error = new mongoose.mongo.MongoNetworkError('connection reset');

    const thrown = await thrownBy(repository, error);

    expect(thrown).toBeInstanceOf(InfrastructureError);
    expect(thrown).toMatchObject({ type: 'CONNECTION_ERROR', data: { cause: error } });
  });

  it('translates any driver error into CONNECTION_ERROR while the connection is not open', async () => {
    const error = new mongoose.MongooseError('Operation `users.findOne()` buffering timed out after 10000ms');

    const thrown = await thrownBy(repository, error);

    expect(thrown).toMatchObject({ type: 'CONNECTION_ERROR', data: { cause: error } });
  });

  it('translates any other driver error into a PersistanceError while the connection is open', async () => {
    stubReadyState(UserModel.db, mongoose.ConnectionStates.connected);
    const error = new mongoose.mongo.MongoServerError({ message: 'Unauthorized', code: 13 });

    const thrown = await thrownBy(repository, error);

    expect(thrown).toBeInstanceOf(PersistanceError);
    expect(thrown).toMatchObject({ type: 'DATABASE_ERROR', data: { cause: error } });
  });

  it('translates a malformed id in findById (CastError) into an INVALID_ID RepositoryError', async () => {
    const thrown = await repository.findById('abc').catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(RepositoryError);
    expect(thrown).toMatchObject({ type: 'INVALID_ID', data: { cause: expect.any(mongoose.Error.CastError) } });
  });

  it('translates a malformed id in a filter (mapper BSONError) into an INVALID_ID RepositoryError', async () => {
    const thrown = await repository.find({ role_id: 'abc' }).catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(RepositoryError);
    expect(thrown).toMatchObject({ type: 'INVALID_ID', data: { cause: expect.any(mongoose.mongo.BSON.BSONError) } });
  });
});
