/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { Types } from 'mongoose';

import type { NewEmail } from '@/domain/app/email/models/email';
import { Email } from '@/domain/app/email/models/email';

import { PersistanceError } from '../../../errors/persistance.error';
import { BaseMapper } from '../base/base.mapper';

import type { INewEmailSchema } from './email.model';

export class EmailMapper extends BaseMapper<INewEmailSchema, Email, NewEmail> {
  /**
   * Convert a persisted email log document into an Email domain model.
   *
   * @param {INewEmailSchema & { _id: Types.ObjectId }} data - The raw persisted document.
   * @returns {Email} The mapped domain model.
   * @throws {PersistanceError} When the stored document has no user_id.
   * @throws {DomainEntityError} When the stored document breaks an Email invariant (e.g. a sent email without sent_on).
   */
  toDomain(data: INewEmailSchema & { _id: Types.ObjectId }): Email {
    if (!data.user_id) {
      throw new PersistanceError(`Email ${data._id.toString()} has no user_id`);
    }
    return new Email({
      id: data._id.toString(),
      user_id: data.user_id.toString(),
      ...(data.sent_on && { sent_on: data.sent_on }),
      to: data.to,
      cc: data.cc,
      bcc: data.bcc,
      subject: data.subject,
      body: data.body,
      status: data.status,
      ...(data.error_message && { error_message: data.error_message }),
      ttl: data.ttl,
    });
  }

  /**
   * Convert a new/updated Email domain model into its persistence schema shape.
   *
   * @param {NewEmail} data - The domain model data to persist.
   * @returns {INewEmailSchema} The persistence-ready schema object.
   */
  toPersistence(data: NewEmail): INewEmailSchema {
    // toFilter() (inherited from BaseMapper) also calls this with a partial filter object, so any field may be
    // absent: convert user_id only when present, and add no defaults that would become filter clauses.
    const base = {
      ...(data.user_id !== undefined && { user_id: new Types.ObjectId(data.user_id) }),
      ...(data.sent_on !== undefined && { sent_on: data.sent_on }),
      to: data.to,
      cc: data.cc,
      bcc: data.bcc,
      subject: data.subject,
      body: data.body,
      status: data.status,
      ...(data.error_message !== undefined && { error_message: data.error_message }),
      ttl: data.ttl,
    };
    return !data.id ? base : { ...base, _id: new Types.ObjectId(data.id) };
  }
}
