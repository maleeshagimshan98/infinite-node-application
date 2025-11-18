/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { AwilixContainer } from 'awilix';
import type { ICoreService } from '../core.service';
import type { IEmailConfig } from '../../config/service/email.config';

export class EmailService implements ICoreService<IEmailConfig> {
  private client: unknown | undefined;
  constructor() {}

  async init(container: AwilixContainer, config: IEmailConfig): Promise<void> {
    //... init a email client
  }

  service(): unknown | undefined {
    return this.client;
  }

  async shutdown(): Promise<void> {
    // No persistent connection to close in the placeholder client.
  }
}
