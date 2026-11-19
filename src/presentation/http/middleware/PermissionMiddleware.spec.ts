/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { once } from 'events';

import express from 'express';

import type { AuthenticatedRequest } from '@/app/core/utils/request/authenticated-request';
import { Resource } from '@/domain/auth/models/resource';
import { Role } from '@/domain/auth/models/role';
import type { IPermission } from '@/domain/auth/models/role';
import { User } from '@/domain/user/models/user';

import { PermissionMiddleware } from './PermissionMiddleware';

import type { Server } from 'http';
import type { NextFunction, Response } from 'express';

const READ_ONLY: IPermission = { read: true, write: false, update: false, delete: false };

/**
 * Build a user whose role grants `permission` on the `email-logs` resource, or a user without a loaded role.
 *
 * @param {IPermission} [permission] - The flags granted on `email-logs`; omitted for a user without a role.
 * @returns {User} The user.
 */
function userWith(permission?: IPermission): User {
  const role =
    permission &&
    new Role({
      id: 'role-1',
      version: 0,
      name: 'Administrator',
      default: false,
      resource_permissions: [{ resource_id: 'resource-1', permission }],
      resources: [{ resource: new Resource({ id: 'resource-1', version: 0, name: 'email-logs' }), permission }],
    });
  return new User({
    id: 'user-1',
    version: 0,
    email: 'admin@example.com',
    password: 'hash',
    status: 'active',
    ug_id: 'group-1',
    role_id: 'role-1',
    ...(role && { role }),
  });
}

describe('PermissionMiddleware', () => {
  let server: Server;
  let baseUrl: string;
  let currentUser: User | undefined;
  const handler = jest.fn((_req: AuthenticatedRequest, res: Response) => {
    res.status(200).send('handled');
  });

  beforeAll(async () => {
    const app = express();
    // Stands in for UserValidatorMiddleware, which sets req.user before the permission check.
    app.use((req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
      if (currentUser) {
        req.user = currentUser;
      }
      next();
    });
    app.get('/emails', PermissionMiddleware('email-logs', 'read'), handler);

    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('The test server has no TCP address');
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    server.close();
    await once(server, 'close');
  });

  beforeEach(() => {
    handler.mockClear();
    currentUser = undefined;
  });

  it('passes the request on when the role grants the action', async () => {
    currentUser = userWith(READ_ONLY);

    const response = await fetch(`${baseUrl}/emails`);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('handled');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['the role lacks the flag', (): User => userWith({ ...READ_ONLY, read: false })],
    ['the user has no role', (): User => userWith()],
  ])('answers 403 when %s', async (_case, buildUser) => {
    currentUser = buildUser();

    const response = await fetch(`${baseUrl}/emails`);

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ status: 'error', code: 403 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('answers 403 when the request has no authenticated user', async () => {
    const response = await fetch(`${baseUrl}/emails`);

    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });
});
