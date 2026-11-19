/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import ApiResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import type { EmailLogService } from '@/domain/app/email/service/email-log.service';
import type { IEmailRepository } from '@/application/interfaces/repositories/email/email.repository.interface';
import type { Email } from '@/domain/app/email/models/email';
import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';

import { BaseController } from '../base.controller';

import type { Request, Response } from 'express';

export class EmailLogController extends BaseController {
  constructor(
    private emailLogService: EmailLogService,
    private emailRepository: IEmailRepository,
    logger: ILogger,
  ) {
    super(logger);
  }

  /**
   * Strip the fields that must not leave the API from a logged email: the body, which holds one-time codes while the
   * email is pending, and the error message, which is the raw transport error and can carry hosts and driver details.
   *
   * @param {Email} email - The email to sanitize.
   * @returns {Record<string, unknown>} A plain object safe to serialize in an API response.
   */
  private toSafeEmail(email: Email): Record<string, unknown> {
    return {
      id: email.id,
      version: email.version,
      user_id: email.user_id,
      to: email.to,
      cc: email.cc,
      bcc: email.bcc,
      subject: email.subject,
      status: email.status,
      sent_on: email.sent_on,
      ttl: email.ttl,
    };
  }

  /**
   * Get a paginated list of logged emails, newest first.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async getAll(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const totalCount = await this.emailRepository.count({});
      const paginator = this.getPaginator(req, totalCount);
      const items = await this.emailLogService.getAll(paginator.getResultsPerPage(), paginator.getOffset());

      return ApiResponseUtils.apiOkResponse(
        200,
        true,
        paginator,
        'Emails retrieved successfully',
        items.map((item) => this.toSafeEmail(item)),
      );
    });
    return ApiResponseUtils.createResponse(response, res);
  }

  /**
   * Get a logged email by its id.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>}
   */
  async getById(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const result = await this.emailLogService.getById(this.getStringParam(req, 'id'));

      return ApiResponseUtils.apiOkResponse(200, false, null, 'Email retrieved successfully', this.toSafeEmail(result));
    });
    return ApiResponseUtils.createResponse(response, res);
  }
}

export default EmailLogController;
