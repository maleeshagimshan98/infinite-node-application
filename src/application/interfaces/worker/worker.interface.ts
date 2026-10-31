/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

/**
 * IWorker — Contract for all background workers
 *
 * Every worker in the application must implement this interface.
 * Workers are discovered and managed by InfiniteNodeWorker at startup.
 *
 * Lifecycle:
 *   1. InfiniteNodeWorker resolves all IWorker instances from the DI container
 *   2. Calls init() on each — registers the BullMQ processor and begins consuming jobs
 *   3. On shutdown (SIGTERM / SIGINT), calls shutdown() on each — drains in-flight jobs
 *      before the process exits
 *
 * Naming convention:
 *   - File:  src/application/workers/{feature}/{name}.worker.ts
 *   - Class: ErpRecordImportWorker  →  registered as 'erpRecordImportWorker'
 *   - Must export default ClassName for Awilix auto-registration
 *
 * @example
 * ```typescript
 * export class ErpRecordImportWorker extends BaseApplicationService implements IWorker {
 *   workerName(): string { return 'erp-record-import'; }
 *
 *   async init(): Promise<void> {
 *     await this.queueService.processJobs('erp-batch-records', async (job) => {
 *       await this.processRecord(job.data);
 *     });
 *   }
 *
 *   async shutdown(): Promise<void> {
 *     await this.bullmqWorker.close();
 *   }
 * }
 * export default ErpRecordImportWorker;
 * ```
 */
export interface IWorker {
  /**
   * Human-readable identifier for this worker.
   * Used in log messages and shutdown reporting.
   *
   * @returns {string} The worker name (e.g. 'erp-record-import')
   */
  workerName(): string;

  /**
   * Start the worker — register the BullMQ processor and begin consuming jobs.
   *
   * Called once by InfiniteNodeWorker after infrastructure and DI are fully initialized.
   *
   * @returns {Promise<void>}
   */
  init(): Promise<void>;

  /**
   * Gracefully stop the worker.
   *
   * Must call BullMQ Worker.close() (or equivalent) to drain in-flight jobs
   * before resolving. Called by InfiniteNodeWorker during the HIGH-priority
   * shutdown phase, before infrastructure services are disconnected.
   *
   * @returns {Promise<void>}
   */
  shutdown(): Promise<void>;
}
