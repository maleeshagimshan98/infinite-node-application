/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import * as fs from 'fs/promises';
import * as path from 'path';

import type { IStorage } from '@/application/interfaces/storage.interface';
import { InfrastructureError } from '@/infrastructure/core/errors/infrastructure.error';

import { storageConfig } from './local-file-storage.config';

/**
 * Local Storage Service Implementation
 *
 * Provides file storage functionality using the local file system.
 * Implements the IStorage interface with full CRUD operations for files and folders.
 * All operations are performed relative to a configured root directory.
 *
 * @class LocalStorageService
 * @implements {IStorage}
 *
 * @example
 * ```typescript
 * const storageService = new LocalStorageService('/path/to/storage/root');
 *
 * await storageService.createFile('documents/file.txt', Buffer.from('content'));
 * const content = await storageService.readFile('documents/file.txt');
 * await storageService.deleteFile('documents/file.txt');
 * ```
 */
export class LocalStorageService implements IStorage {
  /**
   * Root directory path for all storage operations
   * @private
   * @readonly
   */
  private readonly rootPath: string;

  /**
   * Creates an instance of LocalStorageService
   *
   * @param {string} rootPath - Absolute path to the storage root directory
   *
   * @example
   * ```typescript
   * const service = new LocalStorageService();
   * ```
   */
  constructor() {
    const config = storageConfig();
    this.rootPath = config.params.rootPath;
  }

  /**
   * Get the service name for this storage implementation
   *
   * @returns {'storage'} The service name identifier
   */
  serviceName(): 'storage' {
    return 'storage';
  }

  /**
   * Indicates that this storage service should be registered as a singleton in the DI container
   *
   * @returns {true} Always returns true for singleton services
   */
  singleton(): true {
    return true;
  }

  /**
   * Indicates whether this storage service should be deferred in the DI container
   *
   * @returns {false} Always returns false for non-deferred services
   */
  deferred(): false {
    return false;
  }

  getDriver(): unknown {
    return null;
  }

  /**
   * Get the root path/directory of the storage
   *
   * @returns {Promise<string>} resolving to the root path
   *
   * @example
   * ```typescript
   * const root = await storageService.getRoot();
   * console.log(`Storage root: ${root}`);
   * ```
   */
  async getRoot(): Promise<string> {
    return this.rootPath;
  }

  /**
   * List all files in a folder
   *
   * @param {string} folderPath - Path to the folder relative to root
   * @returns {Promise<string[]>} Promise resolving to array of relative file paths
   * @throws {InfrastructureError} STORAGE_ERROR if the folder doesn't exist or cannot be read
   *
   * @example
   * ```typescript
   * const files = await storageService.listFiles('documents');
   * // Returns: ['documents/file1.txt', 'documents/file2.pdf']
   * ```
   */
  async listFiles(folderPath: string): Promise<string[]> {
    const fullPath = path.join(this.rootPath, folderPath);

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries.filter((entry) => entry.isFile()).map((entry) => path.join(folderPath, entry.name));
    } catch (e: unknown) {
      throw new InfrastructureError(
        `Failed to list files in folder "${folderPath}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        'STORAGE_ERROR',
        { folderPath },
      );
    }
  }

  /**
   * Create a new file with given content
   *
   * @param {string} filePath - File path relative to root
   * @param {Buffer} content - File content as Buffer
   * @returns {Promise<void>} Promise resolving when file is created
   * @throws {InfrastructureError} STORAGE_ERROR if the file cannot be created
   *
   * @example
   * ```typescript
   * await storageService.createFile('docs/readme.txt', Buffer.from('Hello World'));
   * ```
   */
  async createFile(filePath: string, content: Buffer): Promise<void> {
    const fullPath = path.join(this.rootPath, filePath);
    const directory = path.dirname(fullPath);

    try {
      // Ensure directory exists
      await fs.mkdir(directory, { recursive: true });

      // Write file
      await fs.writeFile(fullPath, content);
    } catch (e: unknown) {
      throw new InfrastructureError(
        `Failed to create file "${filePath}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        'STORAGE_ERROR',
        { filePath },
      );
    }
  }

  /**
   * Read file content
   *
   * @param {string} filePath - File path relative to root
   * @returns {Promise<Buffer>} Promise resolving to file content as Buffer
   * @throws {InfrastructureError} STORAGE_ERROR if the file doesn't exist or cannot be read
   *
   * @example
   * ```typescript
   * const content = await storageService.readFile('docs/readme.txt');
   * console.log(content.toString());
   * ```
   */
  async readFile(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.rootPath, filePath);
    try {
      return await fs.readFile(fullPath);
    } catch (e: unknown) {
      throw new InfrastructureError(
        `Failed to read file "${filePath}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        'STORAGE_ERROR',
        { filePath },
      );
    }
  }

  /**
   * Update existing file with new content
   *
   * @param {string} filePath - File path relative to root
   * @param {Buffer} content - New file content as Buffer
   * @returns {Promise<void>} Promise resolving when file is updated
   * @throws {InfrastructureError} STORAGE_ERROR if the file cannot be updated
   *
   * @example
   * ```typescript
   * await storageService.updateFile('docs/readme.txt', Buffer.from('Updated content'));
   * ```
   */
  async updateFile(filePath: string, content: Buffer): Promise<void> {
    const fullPath = path.join(this.rootPath, filePath);
    try {
      await fs.writeFile(fullPath, content);
    } catch (e: unknown) {
      throw new InfrastructureError(
        `Failed to update file "${filePath}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        'STORAGE_ERROR',
        { filePath },
      );
    }
  }

  /**
   * Delete a file
   *
   * @param {string} filePath - File path relative to root
   * @returns {Promise<void>} Promise resolving when file is deleted
   * @throws {InfrastructureError} STORAGE_ERROR if the file cannot be deleted
   *
   * @example
   * ```typescript
   * await storageService.deleteFile('docs/old-file.txt');
   * ```
   */
  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.rootPath, filePath);
    try {
      await fs.rm(fullPath, { force: true });
    } catch (e: unknown) {
      throw new InfrastructureError(
        `Failed to delete file "${filePath}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        'STORAGE_ERROR',
        { filePath },
      );
    }
  }

  /**
   * Move/rename a file from source to destination
   *
   * @param {string} srcPath - Source file path relative to root
   * @param {string} destPath - Destination file path relative to root
   * @returns {Promise<void>} Promise resolving when file is moved
   * @throws {InfrastructureError} STORAGE_ERROR if the file cannot be moved
   *
   * @example
   * ```typescript
   * await storageService.moveFile('docs/old-name.txt', 'docs/new-name.txt');
   * await storageService.moveFile('docs/file.txt', 'archive/file.txt');
   * ```
   */
  async moveFile(srcPath: string, destPath: string): Promise<void> {
    const fullSrcPath = path.join(this.rootPath, srcPath);
    const fullDestPath = path.join(this.rootPath, destPath);
    const destDirectory = path.dirname(fullDestPath);

    try {
      // Ensure destination directory exists
      await fs.mkdir(destDirectory, { recursive: true });

      // Rename/move file
      await fs.rename(fullSrcPath, fullDestPath);
    } catch (e: unknown) {
      throw new InfrastructureError(
        `Failed to move file from "${srcPath}" to "${destPath}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        'STORAGE_ERROR',
        { srcPath, destPath },
      );
    }
  }

  /**
   * Create a new folder/directory
   *
   * @param {string} folderPath - Folder path relative to root
   * @returns {Promise<void>} Promise resolving when folder is created
   * @throws {InfrastructureError} STORAGE_ERROR if the folder cannot be created
   *
   * @example
   * ```typescript
   * await storageService.createFolder('documents/archive');
   * ```
   */
  async createFolder(folderPath: string): Promise<void> {
    const fullPath = path.join(this.rootPath, folderPath);
    try {
      await fs.mkdir(fullPath, { recursive: true });
    } catch (e: unknown) {
      throw new InfrastructureError(
        `Failed to create folder "${folderPath}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        'STORAGE_ERROR',
        { folderPath },
      );
    }
  }

  /**
   * Delete a folder/directory
   *
   * @param {string} folderPath - Folder path relative to root
   * @returns {Promise<void>} Promise resolving when folder is deleted
   * @throws {InfrastructureError} STORAGE_ERROR if the folder cannot be deleted
   *
   * @example
   * ```typescript
   * await storageService.deleteFolder('documents/old-archive');
   * ```
   */
  async deleteFolder(folderPath: string): Promise<void> {
    const fullPath = path.join(this.rootPath, folderPath);
    try {
      await fs.rm(fullPath, { recursive: true, force: true });
    } catch (e: unknown) {
      throw new InfrastructureError(
        `Failed to delete folder "${folderPath}": ${e instanceof Error ? e.message : 'Unknown error'}`,
        'STORAGE_ERROR',
        { folderPath },
      );
    }
  }
}
