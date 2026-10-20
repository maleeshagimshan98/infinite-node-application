/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { matchedData } from 'express-validator';

import ApiResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import type { ResourceService } from '@/domain/auth/service/resource.service';
import type { IResourceRepository } from '@/application/interfaces/repositories/auth/resource.repository.interface';
import type { INewResource } from '@/domain/auth/models/resource';
import type { ILogger } from '@/application/interfaces/logger.interface';

import { BaseController } from '../base.controller';

import type { Request, Response } from 'express';

export class ResourceController extends BaseController {
  constructor(
    private resourceService: ResourceService,
    private resourceRepository: IResourceRepository,
    logger: ILogger,
  ) {
    super(logger);
  }

  /**
   * Create a new resource.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async create(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const data = matchedData<INewResource>(req);
      const result = await this.resourceService.create(data);

      return ApiResponseUtils.apiOkResponse(201, false, null, 'Resource created successfully', result);
    });
    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Get a paginated list of resources.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async getAll(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const totalCount = await this.resourceRepository.count({});
      const paginator = this.getPaginator(req, totalCount);
      const items = await this.resourceService.getAll(paginator.getResultsPerPage(), paginator.getOffset());

      return ApiResponseUtils.apiOkResponse(200, true, paginator, 'Resources retrieved successfully', items);
    });
    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Get a resource by its id.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async getById(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const result = await this.resourceService.getById(this.getStringParam(req, 'id'));

      return ApiResponseUtils.apiOkResponse(200, false, null, 'Resource retrieved successfully', result);
    });
    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Update a resource by its id.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async update(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const data = matchedData<Partial<INewResource>>(req);
      const result = await this.resourceService.update(this.getStringParam(req, 'id'), data);

      return ApiResponseUtils.apiOkResponse(200, false, null, 'Resource updated successfully', result);
    });
    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Delete a resource by its id.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async delete(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const result = await this.resourceService.delete(this.getStringParam(req, 'id'));

      return ApiResponseUtils.apiOkResponse(200, false, null, 'Resource deleted successfully', result);
    });
    return ApiResponseUtils.createResponse(response, res);
  }
}

export default ResourceController;
