/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { BulkImportFileJob, NewBulkImportFileJob } from '@/domain/bulk-import/models/bulk-import-file-job';

import type { IBaseRepository } from '../base.repository.interface';

export interface IBulkImportFileJobRepository extends IBaseRepository<BulkImportFileJob, NewBulkImportFileJob> {}

export default IBulkImportFileJobRepository;
