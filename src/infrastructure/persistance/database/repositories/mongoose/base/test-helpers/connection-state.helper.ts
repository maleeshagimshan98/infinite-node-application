/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type mongoose from 'mongoose';

/**
 * Make a connection report the given readyState without connecting. Mongoose defines `readyState` as a
 * non-configurable accessor on Connection.prototype, so jest.spyOn cannot stub it, and its setter emits
 * connection events — instead, shadow it with a configurable own property on the instance.
 *
 * @param {mongoose.Connection} connection - The connection to stub.
 * @param {mongoose.ConnectionStates} state - The state the connection should report.
 * @returns {void}
 */
export function stubReadyState(connection: mongoose.Connection, state: mongoose.ConnectionStates): void {
  Object.defineProperty(connection, 'readyState', { configurable: true, get: () => state });
}

/**
 * Remove a stub installed by stubReadyState, restoring the connection's real readyState.
 *
 * @param {mongoose.Connection} connection - The connection to restore.
 * @returns {void}
 */
export function restoreReadyState(connection: mongoose.Connection): void {
  Reflect.deleteProperty(connection, 'readyState');
}
