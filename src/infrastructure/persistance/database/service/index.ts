/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

/**
 * Database Service Infrastructure Module
 *
 * Barrel export for database service implementations and factory.
 */

export { MongoDBService } from './mongodb.service';
export { DatabaseServiceFactory } from './database-service.factory';
export type { DatabaseDriverType } from './database-service.factory';

export { MongooseService } from './database-mapper/mongoose.service';
export { DatabaseMapperServiceFactory } from './database-mapper/database-mapper-service.factory';
export type { DatabaseMapperDriverType as ORMDriverType } from './database-mapper/database-mapper-service.factory';
