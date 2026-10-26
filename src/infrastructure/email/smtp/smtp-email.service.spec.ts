/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import nodemailer from 'nodemailer';

import { CircuitBreaker } from '@/infrastructure/core/core.circuit-breaker';
import { CircuitOpenError } from '@/infrastructure/core/errors/circuit-open.error';

import { SMTPDriver } from './driver/smtp.driver';
import { smtpConfig } from './driver/smtp.config';
import { isSmtpOutage } from './error/smtp-error.guards';
import { SmtpError } from './error/smtp.error';
import { SMTPEmailService } from './smtp-email.service';

import type { Transporter } from 'nodemailer';

// jsonTransport never opens a connection; every send these tests make is stubbed anyway.
const transporter: Transporter = nodemailer.createTransport({ jsonTransport: true });

class StubSMTPDriver extends SMTPDriver {
  override client(): Transporter {
    return transporter;
  }
}

/**
 * Build an error shaped like nodemailer's, carrying its `code`.
 *
 * @param {string} code - The nodemailer error code.
 * @returns {Error & { code: string }} The error.
 */
function nodemailerError(code: string): Error & { code: string } {
  return Object.assign(new Error(`SMTP failure (${code})`), { code });
}

/**
 * Create the service with a breaker that opens on the first counted failure.
 *
 * @returns {{ service: SMTPEmailService; breaker: CircuitBreaker }} The service and its breaker.
 */
function createService(): { service: SMTPEmailService; breaker: CircuitBreaker } {
  const breaker = new CircuitBreaker({
    name: 'smtp',
    failureThreshold: 0,
    resetTimeout: 1000,
    isFailure: isSmtpOutage,
  });
  return { service: new SMTPEmailService(new StubSMTPDriver(smtpConfig()), breaker), breaker };
}

describe('SMTPEmailService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('wraps a transport failure in an SmtpError carrying the nodemailer code and the original as data.cause', async () => {
    const failure = nodemailerError('ECONNECTION');
    jest.spyOn(transporter, 'sendMail').mockImplementation((): Promise<never> => Promise.reject(failure));
    const { service } = createService();

    const thrown = await service.sendEmail('user@example.com', 'Subject', 'Body').catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(SmtpError);
    expect(thrown).toMatchObject({ type: 'EMAIL_ERROR', data: { code: 'ECONNECTION', cause: failure } });
  });

  it('stops calling the SMTP server once a connection failure opens the circuit', async () => {
    const sendMail = jest
      .spyOn(transporter, 'sendMail')
      .mockImplementation((): Promise<never> => Promise.reject(nodemailerError('ECONNECTION')));
    const { service, breaker } = createService();

    await expect(service.sendEmail('user@example.com', 'Subject', 'Body')).rejects.toBeInstanceOf(SmtpError);
    await expect(service.sendEmail('user@example.com', 'Subject', 'Body')).rejects.toBeInstanceOf(CircuitOpenError);

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(breaker.state).toBe('open');
  });

  it('keeps the circuit closed when the server rejects the message itself', async () => {
    const sendMail = jest
      .spyOn(transporter, 'sendMail')
      .mockImplementation((): Promise<never> => Promise.reject(nodemailerError('EENVELOPE')));
    const { service, breaker } = createService();

    await expect(service.sendEmail('bad@example.com', 'Subject', 'Body')).rejects.toBeInstanceOf(SmtpError);
    await expect(service.sendEmail('bad@example.com', 'Subject', 'Body')).rejects.toBeInstanceOf(SmtpError);

    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(breaker.state).toBe('closed');
  });
});

describe('isSmtpOutage', () => {
  it.each(['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS', 'EAUTH'])('counts an SmtpError with code %s', (code) => {
    expect(isSmtpOutage(new SmtpError('failed', { code }))).toBe(true);
  });

  it.each(['EENVELOPE', 'EMESSAGE'])('does not count an SmtpError with code %s', (code) => {
    expect(isSmtpOutage(new SmtpError('rejected', { code }))).toBe(false);
  });

  it('counts an SmtpError without a code', () => {
    expect(isSmtpOutage(new SmtpError('failed', {}))).toBe(true);
  });

  it('does not count an error that is not an SmtpError', () => {
    expect(isSmtpOutage(nodemailerError('ECONNECTION'))).toBe(false);
  });
});
