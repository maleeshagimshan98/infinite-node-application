/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import crypto from 'crypto';

import { PreconditionFailedException } from './precondition-failed-exception';

// A strong entity tag this API issues: `"<version>"` or `"<version>-<digest>"`.
const ENTITY_TAG_PATTERN = /^"(\d+)(?:-[A-Za-z0-9_-]+)?"$/;

/**
 * Build the strong entity tag (`ETag`) of a single-record response: `"<version>-<digest>"`. The version is what an
 * `If-Match` on a later write is checked against. The digest covers the response's data, because a role or user
 * response embeds populated records whose changes don't move the root's version, and Express answers a matching
 * `If-None-Match` with 304: a version-only tag would let a client keep stale embedded data.
 *
 * @param {number} version - The record's version.
 * @param {unknown} representation - The data sent in the response body for the record.
 * @returns {string} The quoted entity tag.
 */
export function formatEntityTag(version: number, representation: unknown): string {
  const digest = crypto
    .createHash('sha256')
    .update(String(JSON.stringify(representation)))
    .digest('base64url')
    .slice(0, 16);
  return `"${version}-${digest}"`;
}

/**
 * Read the version an `If-Match` header requires. Only the version part of the tag is compared: a write's
 * precondition is about the record's own fields, not about the embedded records the digest also covers.
 *
 * @param {string | undefined} header - The raw `If-Match` header value.
 * @returns {number | undefined} The required version, or undefined when the header is absent, empty or `*` (any
 * current representation).
 * @throws {PreconditionFailedException} When the header is a weak tag, a list or anything else that can never match
 * the strong tag this API issues.
 */
export function parseIfMatch(header: string | undefined): number | undefined {
  const value = header?.trim();
  if (!value || value === '*') {
    return undefined;
  }
  const match = ENTITY_TAG_PATTERN.exec(value);
  const version = match ? Number(match[1]) : NaN;
  if (!Number.isSafeInteger(version)) {
    throw new PreconditionFailedException(
      'If-Match must carry the single ETag returned when the record was read, e.g. If-Match: "3-…".',
    );
  }
  return version;
}
