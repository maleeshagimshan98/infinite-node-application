/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import type { ICoreDriver } from '../core.driver';
import type { IEmailConfig } from '../../config/drivers/email.config';

export class EmailDriver implements ICoreDriver<unknown, IEmailConfig> {
  private client: unknown | undefined;
  constructor() {}

  async init(container: AwilixContainer, config: IEmailConfig): Promise<void> {
    //... init a email client
  }

  driver(): unknown | undefined {
    return this.client;
  }

  async shutdown(): Promise<void> {
    // No persistent connection to close in the placeholder client.
  }
}
