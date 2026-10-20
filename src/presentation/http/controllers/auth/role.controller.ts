/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { matchedData } from 'express-validator';

import ApiResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import type { RoleService } from '@/domain/auth/service/role.service';
import type { IRoleRepository } from '@/application/interfaces/repositories/auth/role.repository.interface';
import type { INewRole } from '@/domain/auth/models/role';
import type { ILogger } from '@/application/interfaces/logger.interface';

import { BaseController } from '../base.controller';

import type { Request, Response } from 'express';

export class RoleController extends BaseController {
  constructor(
    private roleService: RoleService,
    private roleRepository: IRoleRepository,
    logger: ILogger,
  ) {
    super(logger);
  }

  /**
   * Create a new role.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async create(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const data = matchedData<INewRole>(req);
      const result = await this.roleService.create(data);

      return ApiResponseUtils.apiOkResponse(201, false, null, 'Role created successfully', result);
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
   * Get a role by its id.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async getById(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const result = await this.roleService.getById(this.getStringParam(req, 'id'));

      return ApiResponseUtils.apiOkResponse(200, false, null, 'Role retrieved successfully', result);
    });
    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Update a role by its id.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async update(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const data = matchedData<Partial<INewRole>>(req);
      const result = await this.roleService.update(this.getStringParam(req, 'id'), data);

      return ApiResponseUtils.apiOkResponse(200, false, null, 'Role updated successfully', result);
    });
    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Delete a role by its id.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async delete(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const result = await this.roleService.delete(this.getStringParam(req, 'id'));

      return ApiResponseUtils.apiOkResponse(200, false, null, 'Role deleted successfully', result);
    });
    return ApiResponseUtils.createResponse(response, res);
  }
}

export default RoleController;
