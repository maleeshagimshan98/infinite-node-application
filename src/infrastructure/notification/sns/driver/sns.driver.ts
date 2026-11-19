/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { ListTopicsCommand, SNSClient } from '@aws-sdk/client-sns';

import type { ICoreDriver, IDriverHealthStatus } from '@/infrastructure/core/driver/core.driver';
import { DriverError } from '@/infrastructure/core/errors/driver.error';

import type { ISNSConfig } from './sns.config';

/**
 * AWS SNS Push Notification Driver
 *
 * Builds the SNS client. Credentials come from the AWS SDK's default provider chain, so in production the ECS
 * task role signs every request.
 *
 * @class SNSDriver
 * @implements {ICoreDriver<SNSClient, ISNSConfig>}
 */
export class SNSDriver implements ICoreDriver<SNSClient, ISNSConfig> {
  /**
   * The underlying SNS client instance
   *
   * @type {SNSClient | undefined}
   */
  private _client: SNSClient | undefined;

  /**
   * SNS configuration for the driver
   *
   * @type {ISNSConfig}
   */
  private _config: ISNSConfig;

  constructor(config: ISNSConfig) {
    this._config = config;
  }

  /**
   * Initialize the SNS client with the provided configuration
   *
   * Makes no network call, so a temporarily unreachable SNS does not abort application startup. The region is
   * resolved here so that a missing one fails startup instead of every publish.
   *
   * @returns {Promise<void>}
   * @throws {DriverError} When no region is configured
   */
  async init(): Promise<void> {
    const client = new SNSClient({
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
        'SNS region is not configured: set NOTIFICATION_SNS_REGION or AWS_REGION',
        error instanceof Error ? error : undefined,
      );
    }

    this._client = client;
  }

  /**
   * Get the driver's configuration.
   *
   * @returns {ISNSConfig} The configuration the driver was created with.
   */
  config(): ISNSConfig {
    return this._config;
  }

  /**
   * Get the underlying SNS client instance
   *
   * @returns {SNSClient | undefined} The SNS client instance
   */
  client(): SNSClient | undefined {
    return this._client;
  }

  /**
   * Shutdown the SNS client and cleanup resources
   *
   * @returns {Promise<void>}
   */
  async shutdown(): Promise<void> {
    this._client?.destroy();
    this._client = undefined;
  }

  /**
   * Check that SNS can be reached with the configured credentials, by listing the account's topics
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
          error: 'SNS client not initialized',
        };
      }

      const start = process.hrtime.bigint();
      await this._client.send(new ListTopicsCommand({}), {
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
