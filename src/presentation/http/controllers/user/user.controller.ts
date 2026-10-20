/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { matchedData } from 'express-validator';

import ApiResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import type { UserService } from '@/domain/user/service/user.service';
import type { IUserRepository } from '@/application/interfaces/repositories/user/user.repository.interface';
import type { User, INewUser } from '@/domain/user/models/user';
import type { ILogger } from '@/application/interfaces/logger.interface';

import { BaseController } from '../base.controller';

import type { Request, Response } from 'express';

export class UserController extends BaseController {
  constructor(
    private userService: UserService,
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
      email: user.email,
      status: user.status,
      ug_id: user.ug_id,
      role_id: user.role_id,
      role: user.role,
    };
  }

  /**
   * Create a new user.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async create(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const data = matchedData<INewUser>(req);
      const result = await this.userService.create(data);

      return ApiResponseUtils.apiOkResponse(201, false, null, 'User created successfully', this.toSafeUser(result));
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
   * Get a user by its id.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async getById(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const result = await this.userService.getById(this.getStringParam(req, 'id'));

      return ApiResponseUtils.apiOkResponse(200, false, null, 'User retrieved successfully', this.toSafeUser(result));
    });
    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Update a user by its id.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async update(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const data = matchedData<Partial<INewUser>>(req);
      const result = await this.userService.update(this.getStringParam(req, 'id'), data);

      return ApiResponseUtils.apiOkResponse(200, false, null, 'User updated successfully', this.toSafeUser(result));
    });
    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Delete a user by its id.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async delete(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const result = await this.userService.delete(this.getStringParam(req, 'id'));

      return ApiResponseUtils.apiOkResponse(200, false, null, 'User deleted successfully', this.toSafeUser(result));
    });
    return ApiResponseUtils.createResponse(response, res);
  }
}

export default UserController;
