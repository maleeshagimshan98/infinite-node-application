/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import mongoose from 'mongoose';

/**
 * Determine whether an error originated from Mongoose or the underlying MongoDB driver.
 *
 * @param {unknown} err - The thrown value to classify.
 * @returns {boolean} True when `err` is a MongooseError or a MongoDB driver MongoError.
 */
export function isMongooseDriverError(err: unknown): err is mongoose.MongooseError | mongoose.mongo.MongoError {
  return err instanceof mongoose.MongooseError || err instanceof mongoose.mongo.MongoError;
}

/**
 * Determine whether a driver error is labelled for a transaction retry. `withTransaction` retries the
 * callback only while such an error escapes it unchanged, so it must never be wrapped.
 *
 * @param {unknown} err - The thrown value to classify.
 * @returns {boolean} True when `err` is a MongoError labelled TransientTransactionError or UnknownTransactionCommitResult.
 */
export function hasTransactionRetryLabel(err: unknown): boolean {
  return (
    err instanceof mongoose.mongo.MongoError &&
    (err.hasErrorLabel(mongoose.mongo.MongoErrorLabel.TransientTransactionError) ||
      err.hasErrorLabel(mongoose.mongo.MongoErrorLabel.UnknownTransactionCommitResult))
  );
}

/**
 * Determine whether a driver error is a unique index violation (E11000), including the
 * MongoBulkWriteError thrown by insertMany.
 *
 * @param {unknown} err - The thrown value to classify.
 * @returns {boolean} True when `err` is a MongoServerError with the duplicate key code 11000 / 11001.
 */
export function isDuplicateKeyError(err: unknown): err is mongoose.mongo.MongoServerError {
  return err instanceof mongoose.mongo.MongoServerError && (err.code === 11000 || err.code === 11001);
}

/**
 * Determine whether an error was caused by a malformed ObjectId — either Mongoose failing to cast a
 * query value, or a mapper's `new Types.ObjectId()` rejecting its input before any query runs.
 *
 * @param {unknown} err - The thrown value to classify.
 * @returns {boolean} True when `err` is an ObjectId CastError or a BSONError.
 */
export function isMalformedIdError(err: unknown): err is mongoose.Error.CastError | mongoose.mongo.BSON.BSONError {
  return (
    (err instanceof mongoose.Error.CastError && err.kind === 'ObjectId') ||
    mongoose.mongo.BSON.BSONError.isBSONError(err)
  );
}

/**
 * Determine whether a failure means the database could not be reached. With command buffering on
 * (Mongoose's default), an outage surfaces as a plain "buffering timed out" MongooseError rather than a
 * network error, so a connection that is not open counts as a connection failure too.
 *
 * @param {unknown} err - The thrown value to classify.
 * @param {mongoose.ConnectionStates} readyState - The connection's state at the time of the failure.
 * @returns {boolean} True for a network / server-selection / closed-client error, or when the connection is not open.
 */
export function isConnectionFailure(err: unknown, readyState: mongoose.ConnectionStates): boolean {
  return (
    err instanceof mongoose.mongo.MongoNetworkError ||
    err instanceof mongoose.mongo.MongoServerSelectionError ||
    err instanceof mongoose.mongo.MongoTopologyClosedError ||
    err instanceof mongoose.mongo.MongoNotConnectedError ||
    err instanceof mongoose.Error.MongooseServerSelectionError ||
    readyState !== mongoose.ConnectionStates.connected
  );
}
