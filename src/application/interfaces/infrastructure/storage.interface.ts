/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import type { IBaseInfrastructureService } from '@/application/interfaces/infrastructure/core/base-infrastructure-service.interface';

export interface IStorage extends IBaseInfrastructureService {
  /**
   * The DI registration name of this service; it equals its factory's `name()`.
   *
   * @returns {'storage'} Always `storage`.
   */
  serviceName(): 'storage';
  /**
   * Whether the DI container registers this service as a singleton.
   *
   * @returns {true} Always true.
   */
  singleton(): true;
  /**
   * Whether this service's creation is deferred in the DI container.
   *
   * @returns {false} Always false.
   */
  deferred(): false;

  /**
   * Get the root path/directory of the storage
   *
   * @returns {Promise<string>} resolving to the root path
   */
  getRoot(): Promise<string>;

  /**
   * List all files in a folder
   *
   * @param {string} folderPath - Path to the folder
   * @returns {Promise<string[]>} Promise resolving to array of file paths, or [] when the folder does not exist
   * @throws {InfrastructureError} STORAGE_ERROR when the folder cannot be read.
   */
  listFiles(folderPath: string): Promise<string[]>;

  /**
   * Create a new file with given content
   *
   * @param {string} path - File path to create
   * @param {Buffer} content - File content as Buffer
   * @returns {Promise<void>} Promise resolving when file is created
   * @throws {InfrastructureError} STORAGE_ERROR when the file cannot be created.
   */
  createFile(path: string, content: Buffer): Promise<void>;

  /**
   * Read file content
   *
   * @param {string} path - File path to read
   * @returns {Promise<Buffer | null>} Promise resolving to file content as Buffer, or null when the file does not exist
   * @throws {InfrastructureError} STORAGE_ERROR when the file cannot be read.
   */
  readFile(path: string): Promise<Buffer | null>;

  /**
   * Update existing file with new content
   *
   * @param {string} path - File path to update
   * @param {Buffer} content - New file content as Buffer
   * @returns {Promise<void>} Promise resolving when file is updated
   * @throws {InfrastructureError} STORAGE_ERROR when the file cannot be updated.
   */
  updateFile(path: string, content: Buffer): Promise<void>;

  /**
   * Delete a file
   *
   * @param {string} path - File path to delete
   * @returns {Promise<void>} Promise resolving when file is deleted
   * @throws {InfrastructureError} STORAGE_ERROR when the file cannot be deleted.
   */
  deleteFile(path: string): Promise<void>;

  /**
   * Move/rename a file from source to destination
   *
   * @param {string} srcPath - Source file path
   * @param {string} destPath - Destination file path
   * @returns {Promise<void>} Promise resolving when file is moved
   * @throws {InfrastructureError} STORAGE_ERROR when the file cannot be moved.
   */
  moveFile(srcPath: string, destPath: string): Promise<void>;

  /**
   * Create a new folder/directory
   *
   * @param {string} path - Folder path to create
   * @returns {Promise<void>} Promise resolving when folder is created
   * @throws {InfrastructureError} STORAGE_ERROR when the folder cannot be created.
   */
  createFolder(path: string): Promise<void>;

  /**
   * Delete a folder/directory
   *
   * @param {string} path - Folder path to delete
   * @returns {Promise<void>} Promise resolving when folder is deleted
   * @throws {InfrastructureError} STORAGE_ERROR when the folder cannot be deleted.
   */
  deleteFolder(path: string): Promise<void>;
}
