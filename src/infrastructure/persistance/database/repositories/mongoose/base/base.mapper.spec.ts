/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { BaseMapper } from './base.mapper';

import type { Types } from 'mongoose';

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
