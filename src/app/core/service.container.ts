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
  container.loadModules(
    [
      // Application services
      'src/services/**/*.service.{ts,js}',
      // Repositories
      'src/infrastructure/persistance/database/repositories/**/*.repository.{ts,js}',
      // HTTP Controllers
      'src/presentation/http/controllers/**/*.controller.{ts,js}',
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
