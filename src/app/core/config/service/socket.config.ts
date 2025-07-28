/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IServiceConfig } from './core.service.config';

export interface ISocketConfig extends IServiceConfig {
  test: string;
}

export const socketConfig = (): ISocketConfig => ({
  deffered: true,
  test: 'test',
});
