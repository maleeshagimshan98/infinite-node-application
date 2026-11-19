/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { User } from '@/domain/user/models/user';

import { Resource } from './resource';
import { Role } from './role';

import type { IPermission } from './role';

const READ_ONLY: IPermission = { read: true, write: false, update: false, delete: false };
const NONE: IPermission = { read: false, write: false, update: false, delete: false };

/**
 * Build a role granting `permission` on one resource named `resourceName`.
 *
 * @param {string} resourceName - The granted resource's name.
 * @param {IPermission} permission - The flags granted on it.
 * @param {boolean} [populated=true] - Whether the role carries the populated resources.
 * @returns {Role} The role.
 */
function roleWith(resourceName: string, permission: IPermission, populated: boolean = true): Role {
  return new Role({
    id: 'role-1',
    name: 'Administrator',
    default: false,
    resource_permissions: [{ resource_id: 'resource-1', permission }],
    resources: populated ? [{ resource: new Resource({ id: 'resource-1', name: resourceName }), permission }] : [],
  });
}

/**
 * Build a user with the given role.
 *
 * @param {Role} [role] - The user's populated role; omitted for a user whose role was not loaded.
 * @returns {User} The user.
 */
function userWith(role?: Role): User {
  return new User({
    id: 'user-1',
    email: 'admin@example.com',
    password: 'hash',
    status: 'active',
    ug_id: 'group-1',
    role_id: 'role-1',
    ...(role && { role }),
  });
}

describe('Role.hasPermission', () => {
  it('grants an action whose flag is set on the named resource', () => {
    expect(roleWith('email-logs', READ_ONLY).hasPermission('email-logs', 'read')).toBe(true);
  });

  it('denies an action whose flag is not set', () => {
    expect(roleWith('email-logs', READ_ONLY).hasPermission('email-logs', 'delete')).toBe(false);
    expect(roleWith('email-logs', NONE).hasPermission('email-logs', 'read')).toBe(false);
  });

  it('denies a resource the role has no entry for', () => {
    expect(roleWith('users', READ_ONLY).hasPermission('email-logs', 'read')).toBe(false);
  });

  it('denies everything when the role was loaded without its resources', () => {
    expect(roleWith('email-logs', READ_ONLY, false).hasPermission('email-logs', 'read')).toBe(false);
  });
});

describe('User.hasPermission', () => {
  it("delegates to the user's role", () => {
    expect(userWith(roleWith('email-logs', READ_ONLY)).hasPermission('email-logs', 'read')).toBe(true);
    expect(userWith(roleWith('email-logs', NONE)).hasPermission('email-logs', 'read')).toBe(false);
  });

  it('denies everything for a user without a loaded role', () => {
    expect(userWith().hasPermission('email-logs', 'read')).toBe(false);
  });
});
