/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import { InfiniteNodeError } from '../../errors/InfiniteNodeError';
import { registerService } from '../service.container';
import type { IEmailConfig } from '../../config/drivers/email.config';
import { EmailDriver } from './email.driver';

export const emailDriverLoader = async (container: AwilixContainer, config: IEmailConfig): Promise<EmailDriver> => {
  try {
    const emailDriver: EmailDriver = new EmailDriver();
    await emailDriver.init(container, config);
    const client = emailDriver.driver();
    if (config.optional !== true && (!client || !(client instanceof Object))) {
      throw new InfiniteNodeError('Email client is not properly initialized.');
    }
    registerService(config.driverName, 'singleton', client);
    return emailDriver;
  } catch (error: unknown) {
    if (error instanceof InfiniteNodeError) {
      throw error;
    }
    throw new InfiniteNodeError(
      `Failed to load EmailDriver: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};
