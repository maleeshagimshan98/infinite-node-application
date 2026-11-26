/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { matchedData } from 'express-validator';

import ApiResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import type { UserService } from '@/domain/user/service/user.service';
import type { UserApplicationService } from '@/application/services/user/user.application.service';
import type { IUserRepository } from '@/application/interfaces/repositories/user/user.repository.interface';
import type { User, INewUser } from '@/domain/user/models/user';
import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';

import { BaseController } from '../base.controller';

import type { Request, Response } from 'express';

export class UserController extends BaseController {
  constructor(
    private userService: UserService,
    private userApplicationService: UserApplicationService, // update() can end the user's sessions, in a transaction
    private userRepository: IUserRepository,
    logger: ILogger,
  ) {
    super(logger);
  }

  /**
   * Strip sensitive fields (the password hash) from a user before it leaves the API.
   *
   * @param {User} user - The user to sanitize.
   * @returns {Record<string, unknown>} A plain object safe to serialize in an API response.
   */
  private toSafeUser(user: User): Record<string, unknown> {
    return {
      id: user.id,
      version: user.version,
      email: user.email,
      status: user.status,
      ug_id: user.ug_id,
      role_id: user.role_id,
      role: user.role,
    };
  }

  /**
   * Create a new user. The response carries the user's `ETag`.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async create(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const data = matchedData<INewUser>(req);
      const result = await this.userService.create(data);

      const safeUser = this.toSafeUser(result);
      return ApiResponseUtils.apiOkResponse(
        201,
        false,
        null,
        'User created successfully',
        safeUser,
        this.entityTagHeader(result.version, safeUser),
      );
    });
    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Get a paginated list of users.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async getAll(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const totalCount = await this.userRepository.count({});
      const paginator = this.getPaginator(req, totalCount);
      const items = await this.userService.getAll(paginator.getResultsPerPage(), paginator.getOffset());

      return ApiResponseUtils.apiOkResponse(
        200,
        true,
        paginator,
        'Users retrieved successfully',
        items.map((item) => this.toSafeUser(item)),
      );
    });
    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Get a user by its id. The response carries the user's `ETag`, which a later update or delete can send back in
   * `If-Match`.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async getById(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const result = await this.userService.getById(this.getStringParam(req, 'id'));

      const safeUser = this.toSafeUser(result);
      return ApiResponseUtils.apiOkResponse(
        200,
        false,
        null,
        'User retrieved successfully',
        safeUser,
        this.entityTagHeader(result.version, safeUser),
      );
    });
    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Update a user by its id. The request carries the version of the user the client read, as `version` in the body or
   * as the `ETag` in `If-Match`: a stale version is answered with 409 (CONFLICT), or 412 when it came in
   * `If-Match`, and nothing changes. The response carries the new version and `ETag`. A new password, or a status
   * other than `active`, ends every session of the user, including the one that made this request.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async update(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const id = this.getStringParam(req, 'id');
      const data = matchedData<Partial<INewUser>>(req);
      const result = await this.withExpectedVersion(req, data.version, (version) =>
        this.userApplicationService.update(id, { ...data, version }),
      );

      const safeUser = this.toSafeUser(result);
      return ApiResponseUtils.apiOkResponse(
        200,
        false,
        null,
        'User updated successfully',
        safeUser,
        this.entityTagHeader(result.version, safeUser),
      );
    });
    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Delete a user by its id. The request carries the version of the user the client read, as the `ETag` in
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
        this.userService.delete(id, version),
      );

      return ApiResponseUtils.apiOkResponse(200, false, null, 'User deleted successfully', this.toSafeUser(result));
    });
    return ApiResponseUtils.createResponse(response, res);
  }
}

export default UserController;
