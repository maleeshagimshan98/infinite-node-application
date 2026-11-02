/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { GetAccountCommand, SESv2Client } from '@aws-sdk/client-sesv2';

import type { ICoreDriver, IDriverHealthStatus } from '@/infrastructure/core/driver/core.driver';
import { DriverError } from '@/infrastructure/core/errors/driver.error';

import type { ISESConfig } from './ses.config';

/**
 * AWS SES Email Driver
 *
 * Builds the SESv2 client. Credentials come from the AWS SDK's default provider chain, so in production the ECS
 * task role signs every request.
 *
 * @class SESDriver
 * @implements {ICoreDriver<SESv2Client, ISESConfig>}
 */
export class SESDriver implements ICoreDriver<SESv2Client, ISESConfig> {
  /**
   * The underlying SESv2 client instance
   *
   * @type {SESv2Client | undefined}
   */
  private _client: SESv2Client | undefined;

  /**
   * SES configuration for the driver
   *
   * @type {ISESConfig}
   */
  private _config: ISESConfig;

  constructor(config: ISESConfig) {
    this._config = config;
  }

  /**
   * Initialize the SES client with the provided configuration
   *
   * Makes no network call, so a temporarily unreachable SES does not abort application startup. The region is
   * resolved here so that a missing one fails startup instead of every send.
   *
   * @returns {Promise<void>}
   * @throws {DriverError} When no region is configured
   */
  async init(): Promise<void> {
    const client = new SESv2Client({
      ...(this._config.region ? { region: this._config.region } : {}),
      requestHandler: {
        connectionTimeout: this._config.connectionTimeout,
        requestTimeout: this._config.requestTimeout,
        // Without it, an exceeded requestTimeout only logs a warning and the request keeps waiting.
        throwOnRequestTimeout: true,
      },
    });

    try {
      await client.config.region();
    } catch (error) {
      client.destroy();
      throw new DriverError(
        'SES region is not configured: set EMAIL_SES_REGION or AWS_REGION',
        error instanceof Error ? error : undefined,
      );
    }

    this._client = client;
  }

  config(): ISESConfig {
    return this._config;
  }

  /**
   * Get the underlying SES client instance
   *
   * @returns {SESv2Client | undefined} The SESv2 client instance
   */
  client(): SESv2Client | undefined {
    return this._client;
  }

  /**
   * Shutdown the SES client and cleanup resources
   *
   * @returns {Promise<void>}
   */
  async shutdown(): Promise<void> {
    this._client?.destroy();
    this._client = undefined;
  }

  /**
   * Check that SES can be reached with the configured credentials, by reading the account's sending status
   *
   * The check is aborted after one request's worth of timeouts, so the SDK's retries cannot stretch it.
   *
   * @returns {Promise<IDriverHealthStatus>} Health status including connection state and latency
   */
  async health(): Promise<IDriverHealthStatus> {
    try {
      if (!this._client) {
        return {
          connected: false,
          error: 'SES client not initialized',
        };
      }

      const start = process.hrtime.bigint();
      await this._client.send(new GetAccountCommand({}), {
        abortSignal: AbortSignal.timeout(this._config.connectionTimeout + this._config.requestTimeout),
      });
      const end = process.hrtime.bigint();
      const latency = Number((end - start) / BigInt(1000000)); // ns -> ms

      return {
        connected: true,
        latency,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
