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
