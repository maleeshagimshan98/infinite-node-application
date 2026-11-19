/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Types } from 'mongoose';

import { PersistanceError } from '../../../errors/persistance.error';
import { BaseMapper } from './base.mapper';

interface ITestSchema {
  _id?: string;
  full_name?: string;
  email?: string;
}

interface INewTestModel {
  id?: string;
  name?: string;
  email?: string;
}

class TestMapper extends BaseMapper<ITestSchema, unknown, INewTestModel> {
  toDomain(data: ITestSchema & { _id: Types.ObjectId }): unknown {
    return data;
  }

  toPersistence(data: INewTestModel): ITestSchema {
    return {
      ...(data.id ? { _id: data.id } : {}),
      ...(data.name !== undefined ? { full_name: data.name } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
    };
  }
}

class VersionReadingMapper extends TestMapper {
  /**
   * Expose the protected toVersion() to the tests.
   *
   * @param {number | undefined} version - The stored `__v`.
   * @param {Types.ObjectId} id - The document's id.
   * @returns {number} What toVersion() returns.
   */
  readVersion(version: number | undefined, id: Types.ObjectId): number {
    return this.toVersion(version, id);
  }
}

describe('BaseMapper.toVersion', () => {
  const mapper = new VersionReadingMapper();
  const id = new Types.ObjectId();

  it.each([[0], [5]])('returns the stored version %i', (version) => {
    expect(mapper.readVersion(version, id)).toBe(version);
  });

  it('throws a PersistanceError naming the document when it has no __v', () => {
    expect(() => mapper.readVersion(undefined, id)).toThrow(PersistanceError);
    expect(() => mapper.readVersion(undefined, id)).toThrow(id.toString());
  });
});

describe('BaseMapper.toFilter', () => {
  it('translates domain field names to persistence field names using toPersistence', () => {
    const mapper = new TestMapper();

    expect(mapper.toFilter({ id: 'abc-123', name: 'Alice', email: 'alice@example.com' })).toEqual({
      _id: 'abc-123',
      full_name: 'Alice',
      email: 'alice@example.com',
    });
  });
});
