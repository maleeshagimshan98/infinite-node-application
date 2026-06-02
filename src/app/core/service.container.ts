/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import path from 'path';

import { asClass, asFunction, createContainer } from 'awilix';

export const container = createContainer({
  injectionMode: 'CLASSIC',
});

export const registerService = (name: string, type: string, service: unknown): void => {
  if (type === 'singleton') {
    container.register({
      [name]: asFunction(() => service).singleton(),
    });
  } else {
    //... TODO - CHECK
    container.register({
      [name]: asFunction(() => service),
    });
  }
};

/**
 * Auto-register application services, repositories, and controllers
 *
 * Uses convention-based naming:
 * - user.service.ts → exports UserService → registered as 'userService'
 * - user.repository.ts → exports UserRepository → registered as 'userRepository'
 * - user.controller.ts → exports UserController → registered as 'userController'
 *
 * @returns {void}
 */
export const autoRegisterApplicationComponents = (): void => {
  // Determine if we're running from compiled (dist) or source (src)
  const isCompiledCode = __dirname.includes('dist');
  const baseDir = isCompiledCode ? 'dist' : 'src';

  container.loadModules(
    [
      // Application layer services
      `${baseDir}/application/services/**/*.service.{ts,js}`,
      // Domain services
      `${baseDir}/domain/**/service/*.service.{ts,js}`,
      // Repositories
      `${baseDir}/infrastructure/persistance/database/repositories/**/*.repository.{ts,js}`,
      // HTTP Controllers
      `${baseDir}/presentation/http/controllers/**/*.controller.{ts,js}`,
    ],
    {
      formatName: 'camelCase', // UserService → userService
      resolverOptions: {
        lifetime: 'SINGLETON',
        register: asClass,
      },
      cwd: path.resolve(__dirname, '../../..'),
    },
  );
};

/**
 * Auto-register worker process components (no HTTP controllers)
 *
 * Used by InfiniteNodeWorker instead of autoRegisterApplicationComponents().
 * Loads the same services and repositories, plus the workers glob, but
 * excludes HTTP controllers which are not needed in the worker process.
 *
 * Convention:
 * - ErpRecordImportWorker → 'erpRecordImportWorker'
 *
 * @returns {void}
 */
export const autoRegisterWorkerComponents = (): void => {
  const isCompiledCode = __dirname.includes('dist');
  const baseDir = isCompiledCode ? 'dist' : 'src';

  container.loadModules(
    [
      // Application layer services
      `${baseDir}/application/services/**/*.service.{ts,js}`,
      // Domain services
      `${baseDir}/domain/**/service/*.service.{ts,js}`,
      // Repositories
      `${baseDir}/infrastructure/persistance/database/repositories/**/*.repository.{ts,js}`,
      // Background workers
      `${baseDir}/application/workers/**/*.worker.{ts,js}`,
    ],
    {
      formatName: 'camelCase', // ErpRecordImportWorker → erpRecordImportWorker
      resolverOptions: {
        lifetime: 'SINGLETON',
        register: asClass,
      },
      cwd: path.resolve(__dirname, '../../..'),
    },
  );
};
