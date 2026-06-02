/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { ShutdownPriority } from './shutdown-priority.enum';

export interface ShutdownHook {
  name: string;
  priority: ShutdownPriority;
  handler: () => Promise<void>;
  timeout?: number; // Optional per-hook timeout in milliseconds
}

export interface ShutdownOptions {
  timeout?: number; // Global timeout in milliseconds (default: 15000)
  forceExitCode?: number; // Exit code for forced shutdown (default: 1)
}

/**
 * Shutdown Manager
 *
 * Coordinates graceful shutdown of the application by executing
 * registered shutdown hooks in priority order with timeout enforcement.
 */
export class ShutdownManager {
  private hooks: ShutdownHook[] = [];
  private shuttingDown = false;
  private readonly globalTimeout: number;
  private readonly forceExitCode: number;

  constructor(options: ShutdownOptions = {}) {
    this.globalTimeout = options.timeout ?? 15000; // 15 seconds default
    this.forceExitCode = options.forceExitCode ?? 1;
  }

  /**
   * Register a shutdown hook
   *
   * @param hook Object containing name, handler, priority, and optional timeout
   */
  registerHook(hook: {
    name: string;
    handler: () => Promise<void>;
    priority: ShutdownPriority;
    timeout?: number;
  }): void {
    const { name, handler, priority, timeout } = hook;

    if (this.shuttingDown) {
      console.warn(`Cannot register hook "${name}" - shutdown already in progress`);
      return;
    }

    this.hooks.push({ name, handler, priority, timeout: timeout ?? 5000 });
    // Sort hooks by priority (ascending)
    this.hooks.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Check if shutdown is in progress
   */
  isShuttingDown(): boolean {
    return this.shuttingDown;
  }

  /**
   * Execute graceful shutdown sequence
   *
   * @param signal The signal that triggered shutdown
   */
  async shutdown(signal: string): Promise<void> {
    if (this.shuttingDown) {
      console.log(`Shutdown already in progress, ignoring ${signal}`);
      return;
    }

    this.shuttingDown = true;
    console.log(`\n🛑 Graceful shutdown initiated (signal: ${signal})`);

    // Start global timeout
    const timeoutHandle = setTimeout(() => {
      console.error(`❌ Shutdown timeout exceeded (${this.globalTimeout}ms) - forcing exit`);
      this.forceExit(this.forceExitCode);
    }, this.globalTimeout);

    try {
      // Group hooks by priority
      const priorityGroups = this.groupHooksByPriority();

      // Execute each priority group sequentially (groups run in parallel)
      for (const [priority, hooks] of priorityGroups) {
        console.log(`\n📍 Executing shutdown hooks - Priority ${priority}`);

        await this.executeHookGroup(hooks);
      }

      console.log('\n✅ Graceful shutdown completed successfully');
      clearTimeout(timeoutHandle);
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Error during graceful shutdown:', error);
      clearTimeout(timeoutHandle);
      this.forceExit(this.forceExitCode);
    }
  }

  /**
   * Force immediate exit
   */
  forceExit(code: number): void {
    console.error(`\n⚠️  Forcing process exit with code ${code}`);
    process.exit(code);
  }

  /**
   * Group hooks by priority level
   */
  private groupHooksByPriority(): Map<ShutdownPriority, ShutdownHook[]> {
    const groups = new Map<ShutdownPriority, ShutdownHook[]>();

    for (const hook of this.hooks) {
      const existing = groups.get(hook.priority) ?? [];
      existing.push(hook);
      groups.set(hook.priority, existing);
    }

    return groups;
  }

  /**
   * Execute all hooks in a priority group (parallel)
   */
  private async executeHookGroup(hooks: ShutdownHook[]): Promise<void> {
    const promises = hooks.map((hook) => this.executeHook(hook));
    await Promise.allSettled(promises);
  }

  /**
   * Execute a single hook with timeout
   */
  private async executeHook(hook: ShutdownHook): Promise<void> {
    const hookTimeout = hook.timeout ?? 5000; // Default 5s per hook

    try {
      console.log(`  • Shutting down: ${hook.name}...`);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Hook timeout')), hookTimeout);
      });

      await Promise.race([hook.handler(), timeoutPromise]);

      console.log(`  ✓ ${hook.name} shutdown complete`);
    } catch (error) {
      console.error(`  ✗ ${hook.name} shutdown failed:`, error);
      // Continue with other hooks even if this one fails
    }
  }
}
