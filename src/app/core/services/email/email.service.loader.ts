/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import type { IEmailConfig } from '../../config/service/email.config';
import { registerService } from '../service.container';

export const emailServiceLoader = (name: string, container: AwilixContainer, options: IEmailConfig): void => {
  try {
    // Assuming EmailService is defined and imported correctly
    const emailService = 'new EmailService()';
    registerService(name, container, options, emailService);
  } catch (error: unknown) {
    throw new InfiniteNodeError(
      `Failed to load EmailService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
