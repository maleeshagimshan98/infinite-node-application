/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import mongoose from 'mongoose';

import { DomainEntityError } from '@/domain/base/DomainEntityError';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

import { PersistanceError } from '../../errors/persistance.error';
import { MongooseDriver } from './driver/mongoose.driver';
import { MongooseService } from './mongoose.service';

class StubDriver extends MongooseDriver {
  override client(): typeof mongoose {
    return mongoose;
  }
}

describe('MongooseService.transaction', () => {
  let service: MongooseService;

  beforeEach(() => {
    service = new MongooseService(
      new StubDriver({ driverName: 'mongoose', singleton: true, deferred: true, uri: 'mongodb://stub' }),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resolves with the value returned by the transaction', async () => {
    jest.spyOn(mongoose.connection, 'transaction').mockResolvedValue('ok');

    await expect(service.transaction(async () => 'ok')).resolves.toBe('ok');
  });

  it.each([
    ['DomainServiceError', new DomainServiceError('Role x not found', 'NOT_FOUND')],
    ['DomainEntityError', new DomainEntityError('Invalid email')],
    ['a non-database InfrastructureError', new InfrastructureError('Redis down', 'QUEUE_ERROR')],
    ['a programming error', new TypeError('x is undefined')],
  ])('rethrows %s thrown by the callback unchanged', async (_label, error) => {
    jest.spyOn(mongoose.connection, 'transaction').mockRejectedValue(error);

    await expect(service.transaction(async () => undefined)).rejects.toBe(error);
  });

  it.each([
    ['a MongoDB driver error', new mongoose.mongo.MongoServerError({ message: 'Transaction numbers...', code: 20 })],
    ['a Mongoose error', new mongoose.Error.ValidationError()],
  ])('wraps %s in a PersistanceError carrying the original as data.cause', async (_label, error) => {
    jest.spyOn(mongoose.connection, 'transaction').mockRejectedValue(error);

    const thrown = await service.transaction(async () => undefined).catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(PersistanceError);
    expect(thrown).toMatchObject({ type: 'DATABASE_ERROR', data: { cause: error } });
  });
});
