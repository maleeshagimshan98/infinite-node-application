/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import nodemailer from 'nodemailer';

import type { ICoreDriver, IDriverHealthStatus } from '@/infrastructure/core/driver/core.driver';

import type { Transporter } from 'nodemailer';
import type { ISMTPConfig } from './smtp.config';

/**
 * SMTP Email Driver
 *
 * Handles the initialization and management of the SMTP email client.
 * This driver provides the low-level email transport functionality.
 */
export class SMTPDriver implements ICoreDriver<Transporter, ISMTPConfig> {
  /**
   * The underlying Nodemailer transporter instance
   *
   * @type {Transporter | undefined}
   */
  private _client: Transporter | undefined;

  /**
   * SMTP configuration for the driver
   *
   * @type {ISMTPConfig}
   */
  private _config: ISMTPConfig;

  constructor(config: ISMTPConfig) {
    this._config = config;
  }

  /**
   * Initialize the SMTP client with the provided configuration
   *
   * Builds the transporter synchronously without performing a network call,
   * so a temporarily unreachable SMTP host does not abort application startup.
   *
   * @returns {Promise<void>}
   */
  async init(): Promise<void> {
    this._client = nodemailer.createTransport({
      host: this._config.host,
      port: this._config.port,
      secure: this._config.secure,
      auth: this._config.auth?.user ? { user: this._config.auth.user, pass: this._config.auth.pass } : undefined,
      connectionTimeout: this._config.connectionTimeout,
      greetingTimeout: this._config.greetingTimeout,
      socketTimeout: this._config.socketTimeout,
    });
  }

  config(): ISMTPConfig {
    return this._config;
  }

  /**
   * Get the underlying SMTP client instance
   *
   * @returns {Transporter | undefined} The Nodemailer transporter instance
   */
  client(): Transporter | undefined {
    return this._client;
  }

  /**
   * Shutdown the SMTP client and cleanup resources
   *
   * @returns {Promise<void>}
   */
  async shutdown(): Promise<void> {
    this._client?.close();
    this._client = undefined;
  }

  /**
   * Check SMTP connection health
   *
   * @returns {Promise<IDriverHealthStatus>} Health status including connection state and latency
   */
  async health(): Promise<IDriverHealthStatus> {
    try {
      if (!this._client) {
        return {
          connected: false,
          error: 'SMTP client not initialized',
        };
      }

      const start = process.hrtime.bigint();
      await this._client.verify();
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
