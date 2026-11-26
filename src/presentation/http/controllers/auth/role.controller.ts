/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { matchedData } from 'express-validator';

import ApiResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import type { RoleService } from '@/domain/auth/service/role.service';
import type { RoleApplicationService } from '@/application/services/auth/role.application.service';
import type { IRoleRepository } from '@/application/interfaces/repositories/auth/role.repository.interface';
import type { INewRole } from '@/domain/auth/models/role';
import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';

import { BaseController } from '../base.controller';

import type { Request, Response } from 'express';

export class RoleController extends BaseController {
  constructor(
    private roleService: RoleService,
    private roleApplicationService: RoleApplicationService, // update() runs in a transaction
    private roleRepository: IRoleRepository,
    logger: ILogger,
  ) {
    super(logger);
  }

  /**
   * Create a new role. The response carries the role's `ETag`.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async create(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const data = matchedData<INewRole>(req);
      const result = await this.roleService.create(data);

      return ApiResponseUtils.apiOkResponse(
        201,
        false,
        null,
        'Role created successfully',
        result,
        this.entityTagHeader(result.version, result),
      );
    });
    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Get a paginated list of roles.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async getAll(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const totalCount = await this.roleRepository.count({});
      const paginator = this.getPaginator(req, totalCount);
      const items = await this.roleService.getAll(paginator.getResultsPerPage(), paginator.getOffset());

      return ApiResponseUtils.apiOkResponse(200, true, paginator, 'Roles retrieved successfully', items);
    });
    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Get a role by its id. The response carries the role's `ETag`, which a later update or delete can send back in
   * `If-Match`.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async getById(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const result = await this.roleService.getById(this.getStringParam(req, 'id'));

      return ApiResponseUtils.apiOkResponse(
        200,
        false,
        null,
        'Role retrieved successfully',
        result,
        this.entityTagHeader(result.version, result),
      );
    });
    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Update a role by its id, in one transaction, so making it the default unsets the old default atomically. The
   * request carries the version of the role the client read, as `version` in the body or as the `ETag` in `If-Match`:
   * a stale version is answered with 409 (CONFLICT), or 412 when it came in `If-Match`, and nothing changes. The
   * response carries the new version and `ETag`. `default: false` on the default role is answered with 400
   * (INVALID_OPERATION).
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async update(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const id = this.getStringParam(req, 'id');
      const data = matchedData<Partial<INewRole>>(req);
      const result = await this.withExpectedVersion(req, data.version, (version) =>
        this.roleApplicationService.update(id, { ...data, version }),
      );

      return ApiResponseUtils.apiOkResponse(
        200,
        false,
        null,
        'Role updated successfully',
        result,
        this.entityTagHeader(result.version, result),
      );
    });
    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Delete a role by its id. The request carries the version of the role the client read, as the `ETag` in
   * `If-Match` or as `?version=`: a stale version is answered with 409 (CONFLICT), or 412 when it came in `If-Match`,
   * and nothing is deleted.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async delete(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const id = this.getStringParam(req, 'id');
      const query = matchedData<{ version?: number }>(req, { locations: ['query'] });
      const result = await this.withExpectedVersion(req, query.version, (version) =>
        this.roleService.delete(id, version),
      );

      return ApiResponseUtils.apiOkResponse(200, false, null, 'Role deleted successfully', result);
    });
    return ApiResponseUtils.createResponse(response, res);
  }
}

export default RoleController;
