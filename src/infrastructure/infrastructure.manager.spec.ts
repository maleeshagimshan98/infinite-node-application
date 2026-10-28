/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { createContainer } from 'awilix';

import type { IBaseInfrastructureService } from '@/application/interfaces/infrastructure/core/base-infrastructure-service.interface';
import type { IHealthCheck } from '@/application/interfaces/infrastructure/health-check.interface';

import { InfrastructureError } from './core/errors/infrastructure.error';
import { InfrastructureManager } from './infrastructure.manager';
import { SocketServiceFactory } from './socket/socket-service.factory';

import type { IServiceFactory, ServiceClosure } from './core/interfaces/service.factory.interface';
import type { InfrastructureFactoryClass } from './infrastructure.loader';
import type { AwilixContainer } from 'awilix';

// Keeps the real factories, and the drivers they import, out of this test.
jest.mock('./infrastructure.loader', () => ({ infrastructureLoader: [] }));

// initForWorker() filters the socket factory out by identity, so this stand-in is never built.
jest.mock('./socket/socket-service.factory', () => ({
  SocketServiceFactory: class {
    name(): string {
      return 'socket';
    }

    async create(): Promise<never> {
      throw new Error('The socket service is not built in a worker');
    }
  },
}));

type Created = IBaseInfrastructureService | ServiceClosure<IBaseInfrastructureService>;

/**
 * Build a fake infrastructure service that records its shutdown.
 *
 * @param {string} name - The service name.
 * @param {string[]} [shutdownLog] - Receives the service name when the service shuts down.
 * @param {boolean} [singleton] - What `singleton()` returns.
 * @returns {IBaseInfrastructureService} The fake service.
 */
function fakeService(name: string, shutdownLog: string[] = [], singleton = true): IBaseInfrastructureService {
  const service: IBaseInfrastructureService = {
    serviceName: () => name,
    singleton: () => singleton,
    deferred: () => false,
    getDriver: () => ({}),
    shutdown: async () => {
      shutdownLog.push(name);
    },
  };
  return service;
}

/**
 * Build a factory class that registers what `create` returns under the given name.
 *
 * @param {string} name - What the factory's `name()` returns.
 * @param {() => Created} create - Builds what the factory's `create()` resolves to.
 * @returns {InfrastructureFactoryClass} The factory class.
 */
function fakeFactory(name: string, create: () => Created): InfrastructureFactoryClass {
  return class implements IServiceFactory<IBaseInfrastructureService> {
    name(): string {
      return name;
    }

    async create(): Promise<Created> {
      return create();
    }
  };
}

describe('InfrastructureManager', () => {
  let container: AwilixContainer;
  let shutdownLog: string[];
  // What each closure was given, keyed by the name of the service it built.
  let injected: Map<string, IBaseInfrastructureService>;

  const QueueFactory = fakeFactory('queue', () => fakeService('queue', shutdownLog));
  const EmailFactory = fakeFactory('email', () => (queue: IBaseInfrastructureService): IBaseInfrastructureService => {
    injected.set('email', queue);
    return fakeService('email', shutdownLog);
  });
  const NotificationFactory = fakeFactory(
    'notification',
    () =>
      (email: IBaseInfrastructureService): IBaseInfrastructureService => {
        injected.set('notification', email);
        return fakeService('notification', shutdownLog);
      },
  );
  const SocketNotificationFactory = fakeFactory(
    'notification',
    () =>
      (socket: IBaseInfrastructureService): IBaseInfrastructureService => {
        injected.set('notification', socket);
        return fakeService('notification', shutdownLog);
      },
  );

  beforeEach(() => {
    container = createContainer({ injectionMode: 'CLASSIC' });
    shutdownLog = [];
    injected = new Map();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers a service the factory returns under the factory name()', async () => {
    await new InfrastructureManager([QueueFactory]).init(container);

    expect(container.resolve<IBaseInfrastructureService>('queue').serviceName()).toBe('queue');
    expect(container.hasRegistration('healthCheck')).toBe(true);
  });

  it('builds a closure once, injecting its dependency by parameter name', async () => {
    let builds = 0;
    const CountingEmailFactory = fakeFactory(
      'email',
      () =>
        (queue: IBaseInfrastructureService): IBaseInfrastructureService => {
          builds += 1;
          injected.set('email', queue);
          return fakeService('email', shutdownLog);
        },
    );

    await new InfrastructureManager([QueueFactory, CountingEmailFactory]).init(container);

    expect(injected.get('email')).toBe(container.resolve('queue'));
    expect(container.resolve('email')).toBe(container.resolve('email'));
    expect(builds).toBe(1);
  });

  it.each<{ order: string; loader: InfrastructureFactoryClass[] }>([
    { order: 'dependencies first', loader: [QueueFactory, EmailFactory, NotificationFactory] },
    { order: 'dependents first', loader: [NotificationFactory, EmailFactory, QueueFactory] },
  ])('builds a closure that depends on another closure, with the loader listing $order', async ({ loader }) => {
    await new InfrastructureManager(loader).init(container);

    expect(injected.get('notification')).toBe(container.resolve('email'));
    expect(injected.get('email')).toBe(container.resolve('queue'));
  });

  it('fails naming the service and its missing dependency, and tracks nothing', async () => {
    const onServiceCreated = jest.fn();
    const manager = new InfrastructureManager([QueueFactory, SocketNotificationFactory]);

    const init = manager.init(container, onServiceCreated);

    await expect(init).rejects.toBeInstanceOf(InfrastructureError);
    await expect(init).rejects.toMatchObject({ type: 'DRIVER_ERROR' });
    await expect(init).rejects.toThrow(/'notification'[\s\S]*Could not resolve 'socket'/);
    expect(onServiceCreated).not.toHaveBeenCalled();
    await manager.shutdown();
    expect(shutdownLog).toEqual([]);
  });

  it('tracks services in build order and shuts dependents down before their dependencies', async () => {
    const created: string[] = [];
    const manager = new InfrastructureManager([NotificationFactory, EmailFactory, QueueFactory]);

    await manager.init(container, (service) => created.push(service.serviceName()));
    const health = await container.resolve<IHealthCheck>('healthCheck').checkHealth();
    await manager.shutdown();

    expect(created).toEqual(['queue', 'email', 'notification']);
    expect(Object.keys(health.services)).toEqual(['queue', 'email', 'notification']);
    expect(shutdownLog).toEqual(['notification', 'email', 'queue']);
  });

  it.each<{ problem: string; create: () => Created }>([
    { problem: 'reports a different serviceName()', create: (): Created => fakeService('mail') },
    {
      problem: 'built from a closure reports a different serviceName()',
      create: (): Created => (): IBaseInfrastructureService => fakeService('mail'),
    },
    { problem: 'is not a singleton', create: (): Created => fakeService('email', [], false) },
  ])('fails when a service $problem', async ({ create }) => {
    const init = new InfrastructureManager([fakeFactory('email', create)]).init(container);

    await expect(init).rejects.toBeInstanceOf(InfrastructureError);
    await expect(init).rejects.toMatchObject({ type: 'DRIVER_ERROR' });
  });

  it('fails in a worker when a service depends on the socket service', async () => {
    const manager = new InfrastructureManager([SocketServiceFactory, SocketNotificationFactory]);

    await expect(manager.initForWorker(container)).rejects.toThrow(/'notification'[\s\S]*Could not resolve 'socket'/);
  });
});
