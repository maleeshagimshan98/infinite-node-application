/**
 * Shutdown Priority Levels
 *
 * Defines the order in which services should be shut down.
 * Lower numbers are shut down first.
 */
export enum ShutdownPriority {
  /**
   * CRITICAL (1): Stop accepting new connections immediately
   * - HTTP Server (stop accepting new requests)
   * - Socket.IO (notify clients and close connections)
   */
  CRITICAL = 1,

  /**
   * HIGH (2): Stop processing new work
   * - BullMQ Workers (stop accepting new jobs)
   * - Active request draining
   */
  HIGH = 2,

  /**
   * MEDIUM (3): Close database and cache connections
   * - MongoDB (close connection)
   * - Redis (quit gracefully)
   */
  MEDIUM = 3,

  /**
   * LOW (4): Flush and close logging
   * - Winston Logger (flush all transports)
   */
  LOW = 4,
}
