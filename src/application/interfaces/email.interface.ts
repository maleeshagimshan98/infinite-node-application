/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export interface IEmail {
  /**
   * Send an email to a recipient
   *
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} body - Email body content (HTML or plain text)
   * @returns {Promise<void>} resolving when email is sent
   */
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}
