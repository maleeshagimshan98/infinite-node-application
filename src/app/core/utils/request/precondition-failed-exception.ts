/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

/**
 * A request's `If-Match` precondition failed: it names a version that is not the record's current one, or it is not
 * an entity tag this API issues. Answered with 412 (Precondition Failed).
 */
class PreconditionFailedException extends Error {}

export { PreconditionFailedException };
