/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { NewUser, User } from './user';

import type { INewUser } from './user';

const fields: INewUser = {
  email: '  Jane.Doe@Example.COM ',
  password: 'hash',
  status: 'pending_verification',
  ug_id: 'group-1',
  role_id: 'role-1',
};

describe('User email', () => {
  it('is stored trimmed and in lowercase, so the unique index also rejects case variants', () => {
    expect(new NewUser(fields).email).toBe('jane.doe@example.com');
    expect(new User({ ...fields, id: 'user-1', version: 0 }).email).toBe('jane.doe@example.com');
  });

  it('is normalized when it is changed', () => {
    const user = new User({ ...fields, id: 'user-1', version: 0 });

    user.email = 'NEW@Example.com ';

    expect(user.email).toBe('new@example.com');
  });
});
