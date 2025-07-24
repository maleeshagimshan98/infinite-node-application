/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import { asFunction } from 'awilix';
import { InfiniteNodeError } from '../../../errors/InfiniteNodeError';
import type { IEmailConfig } from '../../config/service/email.config';

export const emailServiceLoader = (container: AwilixContainer, options: IEmailConfig): void => {
  try {
    // Assuming EmailService is defined and imported correctly
    const emailService = 'new EmailService()';
    container.register({
      emailService: asFunction(() => emailService).singleton(),
    });
  } catch (error: unknown) {
    throw new InfiniteNodeError(
      `Failed to load EmailService: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
