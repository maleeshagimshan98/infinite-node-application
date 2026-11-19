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
 *   2. Calls init() on each — starts the queue processors with IQueue.processJobs()
 *   3. On shutdown (SIGTERM / SIGINT), calls shutdown() on each — closes them with IQueue.closeWorkers(),
 *      which waits for in-flight jobs, before the process exits
 *
 * Every queue init() processes must be closed in shutdown(): an open worker keeps its Redis connection
 * and memory.
 *
 * Naming convention:
 *   - File:  src/application/workers/{feature}/{name}.worker.ts
 *   - Class: ErpRecordImportWorker  →  registered as 'erpRecordImportWorker'
 *   - Must export default ClassName for Awilix auto-registration
 *
 * @example
 * ```typescript
 * const QUEUE_NAME = 'erp-batch-records';
 *
 * export class ErpRecordImportWorker implements IWorker {
 *   constructor(
 *     private readonly queue: IQueue,
 *     private readonly erpRecordService: ErpRecordService,
 *   ) {}
 *
 *   workerName(): string { return 'erp-record-import'; }
 *
 *   async init(): Promise<void> {
 *     await this.queue.processJobs<IErpRecord>(QUEUE_NAME, (job) => this.erpRecordService.import(job.data));
 *   }
 *
 *   async shutdown(): Promise<void> {
 *     await this.queue.closeWorkers(QUEUE_NAME);
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
   * Start the worker — start each queue processor with IQueue.processJobs() and begin consuming jobs.
   *
   * Called once by InfiniteNodeWorker after infrastructure and DI are fully initialized.
   *
   * @returns {Promise<void>}
   * @throws {InfrastructureError} when the worker cannot start, e.g. QUEUE_ERROR for a queue processor.
   */
  init(): Promise<void>;

  /**
   * Gracefully stop the worker.
   *
   * Must call IQueue.closeWorkers(queueName) for every queue init() processes, which waits for the
   * in-flight jobs before resolving. Never close a BullMQ Worker directly. Called by InfiniteNodeWorker
   * during the HIGH-priority shutdown phase, before infrastructure services are disconnected.
   *
   * @returns {Promise<void>}
   * @throws {InfrastructureError} when the worker cannot stop, e.g. QUEUE_ERROR for a queue processor.
   */
  shutdown(): Promise<void>;
}
