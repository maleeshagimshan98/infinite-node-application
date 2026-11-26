/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { matchedData } from 'express-validator';

import ApiResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import type { ResourceService } from '@/domain/auth/service/resource.service';
import type { IResourceRepository } from '@/application/interfaces/repositories/auth/resource.repository.interface';
import type { INewResource } from '@/domain/auth/models/resource';
import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';

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
   * Create a new resource. The response carries the resource's `ETag`.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async create(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const data = matchedData<INewResource>(req);
      const result = await this.resourceService.create(data);

      return ApiResponseUtils.apiOkResponse(
        201,
        false,
        null,
        'Resource created successfully',
        result,
        this.entityTagHeader(result.version, result),
      );
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
   * Get a resource by its id. The response carries the resource's `ETag`, which a later update or delete can send
   * back in `If-Match`.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async getById(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const result = await this.resourceService.getById(this.getStringParam(req, 'id'));

      return ApiResponseUtils.apiOkResponse(
        200,
        false,
        null,
        'Resource retrieved successfully',
        result,
        this.entityTagHeader(result.version, result),
      );
    });
    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Update a resource by its id. The request carries the version of the resource the client read, as `version` in the
   * body or as the `ETag` in `If-Match`: a stale version is answered with 409 (CONFLICT), or 412 when it came in
   * `If-Match`, and nothing changes. The response carries the new version and `ETag`.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async update(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const id = this.getStringParam(req, 'id');
      const data = matchedData<Partial<INewResource>>(req);
      const result = await this.withExpectedVersion(req, data.version, (version) =>
        this.resourceService.update(id, { ...data, version }),
      );

      return ApiResponseUtils.apiOkResponse(
        200,
        false,
        null,
        'Resource updated successfully',
        result,
        this.entityTagHeader(result.version, result),
      );
    });
    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Delete a resource by its id. The request carries the version of the resource the client read, as the `ETag` in
   * `If-Match` or as `?version=`: a stale version is answered with 409 (CONFLICT), or 412 when it came in
   * `If-Match`, and nothing is deleted.
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
        this.resourceService.delete(id, version),
      );

      return ApiResponseUtils.apiOkResponse(200, false, null, 'Resource deleted successfully', result);
    });
    return ApiResponseUtils.createResponse(response, res);
  }
}

export default ResourceController;
