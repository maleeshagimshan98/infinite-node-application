/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { SendEmailCommand, SESv2ServiceException } from '@aws-sdk/client-sesv2';

import type { ICircuitBreaker } from '@/application/interfaces/infrastructure/core/circuit-breaker.interface';
import type { ICircuitBreakerStatus } from '@/application/interfaces/infrastructure/core/circuit-breaker-status.interface';
import type { ILogger } from '@/application/interfaces/infrastructure/logger.interface';
import type { IQueue } from '@/application/interfaces/infrastructure/queue.interface';
import { BaseEmailService } from '@/infrastructure/email/base/base-email.service';
import type { IEmailMessage } from '@/infrastructure/email/base/base-email.service';
import type { EmailLoggerService } from '@/infrastructure/email/email-log/email-logger.service';

import { SesError } from './error/ses.error';

import type { SESDriver } from './driver/ses.driver';
import type { SESv2Client } from '@aws-sdk/client-sesv2';

/**
 * Name the failure: the SES exception's name, or a network error's code (e.g. ECONNREFUSED).
 *
 * @param {unknown} error - What the SES client threw.
 * @returns {string | undefined} The failure's code, or undefined for a value that is not an Error.
 */
function sesErrorCode(error: unknown): string | undefined {
  if (error instanceof SESv2ServiceException) {
    return error.name;
  }
  if (error instanceof Error) {
    return 'code' in error && typeof error.code === 'string' ? error.code : error.name;
  }
  return undefined;
}

/**
 * Copy the parts of a thrown value that are safe to keep. An SDK error holds the raw HTTP response, so only its
 * name, message and stack are kept.
 *
 * @param {unknown} error - What the SES client threw.
 * @returns {Error} A new Error with only the original's name, message and stack.
 */
function safeCause(error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error(String(error));
  }
  const copy = new Error(error.message);
  copy.name = error.name;
  if (error.stack) {
    copy.stack = error.stack;
  }
  return copy;
}

/**
 * Translate what the SES client threw into an SesError.
 *
 * @param {unknown} error - What the SES client threw.
 * @returns {SesError} EMAIL_ERROR with the code, fault, HTTP status, request id and a safe copy of the original.
 */
function toSesError(error: unknown): SesError {
  const serviceError = error instanceof SESv2ServiceException ? error : undefined;
  return new SesError(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`, {
    code: sesErrorCode(error),
    fault: serviceError?.$fault,
    httpStatusCode: serviceError?.$metadata.httpStatusCode,
    requestId: serviceError?.$metadata.requestId,
    cause: safeCause(error),
  });
}

/**
 * AWS SES Email Service Implementation
 *
 * Sends email through the SESv2 API. Sends go through a circuit breaker, so while SES cannot be reached they are
 * rejected immediately instead of each waiting out the SDK's retries and timeouts.
 *
 * Emails are normally queued with `enqueueEmail()` and sent by the email worker through `deliverQueuedEmail()`,
 * which keeps the email log (see BaseEmailService). `sendEmail()` sends immediately and logs nothing.
 *
 * @class SESEmailService
 * @extends {BaseEmailService}
 *
 * @example
 * ```typescript
 * const emailService = new SESEmailService(driver, circuitBreaker, queue, new EmailLoggerService(), logger);
 * const emailId = await emailService.enqueueEmail(
 *   new NewEmail({ user_id, to: ['user@example.com'], subject: 'Welcome!', body: '<h1>Hi</h1>', status: 'pending', ttl: 0 }),
 * );
 * ```
 */
export class SESEmailService extends BaseEmailService {
  private readonly driver: SESDriver;

  /**
   * SESv2 client instance from the driver layer
   *
   * @type {SESv2Client}
   */
  private readonly client: SESv2Client;

  /**
   * Circuit breaker guarding every send
   *
   * @type {ICircuitBreaker}
   */
  private readonly circuitBreaker: ICircuitBreaker;

  /**
   * Creates an instance of SESEmailService from an initialized SES driver, the breaker guarding its sends, the
   * queue that queued emails wait in, the email log, and the application logger
   */
  constructor(
    driver: SESDriver,
    circuitBreaker: ICircuitBreaker,
    queue: IQueue,
    emailLogger: EmailLoggerService,
    logger: ILogger,
  ) {
    super(queue, emailLogger, logger, driver.config().queue);
    this.driver = driver;
    this.circuitBreaker = circuitBreaker;
    const client = this.driver.client();
    if (!client) {
      throw new SesError('Invalid SES client provided to SESEmailService', {});
    }
    this.client = client;
  }

  /**
   * Get the underlying SES driver instance
   *
   * @returns {SESDriver} The SES driver instance
   */
  getDriver(): SESDriver {
    return this.driver;
  }

  /**
   * Report the SES circuit breaker's state for the health check
   *
   * @returns {ICircuitBreakerStatus[]} The single SES breaker's status
   */
  circuitBreakerStatuses(): ICircuitBreakerStatus[] {
    return [this.circuitBreaker.circuitBreakerStatus()];
  }

  /**
   * Hand one message to SES through the circuit breaker
   *
   * @param {IEmailMessage} message - The recipients, subject and body
   * @returns {Promise<void>} resolving when SES has accepted the message
   * @throws {SesError} EMAIL_ERROR when SES cannot be reached or refuses the message; `data.code` holds the SES
   * exception name or the network error code, `data.fault` is 'client' when SES refused it
   * @throws {CircuitOpenError} CONNECTION_ERROR when the SES circuit is open and the message was not attempted
   */
  protected override async transport(message: IEmailMessage): Promise<void> {
    const command = new SendEmailCommand({
      FromEmailAddress: this.driver.config().from,
      Destination: {
        ToAddresses: message.to,
        ...(message.cc.length > 0 ? { CcAddresses: message.cc } : {}),
        ...(message.bcc.length > 0 ? { BccAddresses: message.bcc } : {}),
      },
      Content: {
        Simple: {
          Subject: { Data: message.subject, Charset: 'UTF-8' },
          Body: { Html: { Data: message.body, Charset: 'UTF-8' } },
        },
      },
    });

    await this.circuitBreaker.execute(() =>
      this.client.send(command).catch((error: unknown) => {
        throw toSesError(error);
      }),
    );
  }
}
