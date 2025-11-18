/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import { registerService } from '../service.container';
import type { IEmailConfig } from '../../config/service/email.config';
import { EmailService } from './email.service';

export const emailServiceLoader = async (container: AwilixContainer, config: IEmailConfig): Promise<EmailService> => {
  try {
    const emailService: EmailService = new EmailService();
    await emailService.init(container, config);
    const client = emailService.service();
    if (!client || !(client instanceof Object)) {
      throw new InfiniteNodeError('Email client is not properly initialized.');
    }
    registerService(config.serviceName, 'singleton', client);
    return emailService;
  } catch (error: unknown) {
    throw new InfiniteNodeError(
      `Failed to load EmailService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
