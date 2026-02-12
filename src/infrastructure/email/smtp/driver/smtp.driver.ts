/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ICoreDriver } from '@/infrastructure/core/driver/core.driver';

import type { ISMTPConfig } from './smtp.config';

/**
 * SMTP Email Driver
 *
 * Handles the initialization and management of the SMTP email client.
 * This driver provides the low-level email transport functionality.
 */
export class SMTPDriver implements ICoreDriver<unknown, ISMTPConfig> {
  /**
   * The underlying SMTP client instance (e.g., Nodemailer transporter)
   *
   * @type {unknown | undefined}
   */
  private _client: unknown | undefined;

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
   * @returns {Promise<void>}
   */
  async init(): Promise<void> {
    // TODO: Initialize actual SMTP client (e.g., Nodemailer)
    // Example with Nodemailer:
    // this.client = nodemailer.createTransport({
    //   host: this._config.host,
    //   port: this._config.port,
    //   secure: this._config.secure,
    //   auth: this._config.auth,
    // });

    this._client = this._config; // Placeholder
  }

  config(): ISMTPConfig {
    return this._config;
  }

  /**
   * Get the underlying SMTP client instance
   *
   * @returns {unknown | undefined} The SMTP client instance
   */
  client(): unknown | undefined {
    return this._client;
  }

  /**
   * Shutdown the SMTP client and cleanup resources
   *
   * @returns {Promise<void>}
   */
  async shutdown(): Promise<void> {
    // Cleanup if needed
    this._client = undefined;
  }
}
