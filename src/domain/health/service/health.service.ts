/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { BaseDomainService } from '@/domain/base/service/base.domain.service';
import type { IHealthCheck, IHealthCheckResult } from '@/application/interfaces/health-check.interface';

/**
 * Health Service
 *
 * Domain layer service for health checking.
 * Uses only application layer interfaces - no infrastructure knowledge.
 */
export class HealthService extends BaseDomainService {
  /**
   * Health check implementation instance
   *
   * @private
   */
  private healthCheck: IHealthCheck;

  constructor(healthCheck: IHealthCheck) {
    super();
    this.healthCheck = healthCheck;
  }

  /**
   * Perform comprehensive health check
   *
   * @returns {Promise<IHealthCheckResult>} Complete health status
   */
  async check(): Promise<IHealthCheckResult> {
    return await this.healthCheck.checkHealth();
  }
}

export default HealthService;
