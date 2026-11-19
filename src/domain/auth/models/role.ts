/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { DomainEntity } from '../../base/DomainEntity';

import type { Resource } from './resource';

export interface IPermission {
  read: boolean;
  write: boolean;
  update: boolean;
  delete: boolean;
}

/** One of the actions a role can be granted on a resource. */
export type PermissionAction = keyof IPermission;

/** Write-time shape: which resource (by id) gets which permission flags. */
export interface INewResourcePermission {
  resource_id: string;
  permission: IPermission;
}

/** Read-time (populated) shape: the same pairing, with a fully hydrated Resource. */
export interface IResourcePermission {
  resource: Resource;
  permission: IPermission;
}

export interface INewRole {
  id?: string;
  /** Set on a role read from the database; in an update payload, the version the caller read. */
  version?: number;
  name: string;
  description?: string;
  default: boolean;
  resource_permissions: INewResourcePermission[];
  resources?: IResourcePermission[];
}

export interface IRole extends INewRole {
  id: string;
  version: number;
}

export class NewRole extends DomainEntity {
  protected _id?: string;
  protected _version?: number;
  protected _name: string;
  protected _description: string | undefined;
  protected _default: boolean;
  protected _resource_permissions: INewResourcePermission[];
  protected _resources: IResourcePermission[];

  constructor(data: INewRole) {
    super();
    if (data.id) {
      this._id = data.id;
    }
    if (data.version !== undefined) {
      this._version = NewRole.checkVersion(data.version);
    }
    this._name = data.name;
    if (data.description !== undefined) {
      this._description = data.description;
    }
    this._default = data.default;
    this._resource_permissions = data.resource_permissions;
    this._resources = data.resources ?? [];
  }

  // Getters
  get id(): string | undefined {
    return this._id;
  }

  get version(): number | undefined {
    return this._version;
  }

  get name(): string {
    return this._name;
  }

  get description(): string | undefined {
    return this._description;
  }

  get default(): boolean {
    return this._default;
  }

  get resource_permissions(): INewResourcePermission[] {
    return this._resource_permissions;
  }

  /**
   * The ids of every Resource this role has been granted a permission on.
   *
   * @returns {string[]} Resource ids, always derived from `resource_permissions` so it can never
   * drift out of sync with the underlying permission data.
   */
  get resource_ids(): string[] {
    return this._resource_permissions.map((rp) => rp.resource_id);
  }

  /**
   * The populated read view of this role's granted resources and their permission flags.
   *
   * @returns {IResourcePermission[]} Empty when the role was constructed without population.
   */
  get resources(): IResourcePermission[] {
    return this._resources;
  }

  /**
   * Check whether this role grants an action on a resource.
   *
   * Only the populated `resources` are read, because they carry the resource names: a role loaded without population
   * grants nothing, so a missing populate denies access instead of allowing it.
   *
   * @param {string} resourceName - The resource's name, e.g. `email-logs`.
   * @param {PermissionAction} action - The action to check.
   * @returns {boolean} True when the role has the action's flag set on the named resource.
   */
  hasPermission(resourceName: string, action: PermissionAction): boolean {
    return this._resources.some((rp) => rp.resource.name === resourceName && rp.permission[action]);
  }

  // Setters
  set name(value: string) {
    this._name = value;
  }

  set description(value: string | undefined) {
    this._description = value;
  }

  set default(value: boolean) {
    this._default = value;
  }

  set resource_permissions(value: INewResourcePermission[]) {
    this._resource_permissions = value;
  }
}

export class Role extends NewRole {
  protected _id: string;
  protected _version: number;

  constructor(data: IRole) {
    super(data);
    this._id = data.id;
    // Redeclared fields are reset after super() returns, so assign it here, as _id is.
    this._version = Role.checkVersion(data.version);
  }

  // Override id getter to return required string
  get id(): string {
    return this._id;
  }

  get version(): number {
    return this._version;
  }
}

export default Role;
