/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

/**
 * A write request carries no usable version: neither `If-Match` nor a `version` was sent, or both were sent and they
 * disagree. Answered with 400.
 */
class VersionParamException extends Error {}

export { VersionParamException };
