/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { IStorage } from '@/application/interfaces/storage.interface';
import type { LocalFileStorageClient } from '@/app/core/drivers/storage/local-filestorage/local-file-storage-client';

export class LocalStorageService implements IStorage {
  /**
   * Creates an instance of LocalStorageService
   *
   * @param storageClient - Local file storage client instance from the driver layer
   */
  constructor(private readonly storageClient: LocalFileStorageClient) {}

  /**
   * Get the root path/directory of the storage
   *
   * @returns {Promise<string>} resolving to the root path
   */
  async getRoot(): Promise<string> {
    return this.storageClient.getRoot();
  }

  /**
   * List all files in a folder
   *
   * @param folderPath - Path to the folder
   * @returns {Promise<string[]>} Promise resolving to array of file paths
   */
  async listFiles(folderPath: string): Promise<string[]> {
    const root = this.storageClient.getRoot();
    const fullPath = path.join(root, folderPath);

    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => path.join(folderPath, entry.name));
  }

  /**
   * Create a new file with given content
   *
   * @param filePath - File path to create
   * @param content - File content as Buffer
   * @returns {Promise<void>} Promise resolving when file is created
   */
  async createFile(filePath: string, content: Buffer): Promise<void> {
    const root = this.storageClient.getRoot();
    const fullPath = path.join(root, filePath);
    const directory = path.dirname(fullPath);

    // Ensure directory exists
    await fs.mkdir(directory, { recursive: true });

    // Write file
    await this.storageClient.write(filePath, content);
  }

  /**
   * Read file content
   *
   * @param filePath - File path to read
   * @returns {Promise<Buffer>} Promise resolving to file content as Buffer
   */
  async readFile(filePath: string): Promise<Buffer> {
    return await this.storageClient.read(filePath);
  }

  /**
   * Update existing file with new content
   *
   * @param filePath - File path to update
   * @param content - New file content as Buffer
   * @returns {Promise<void>} Promise resolving when file is updated
   */
  async updateFile(filePath: string, content: Buffer): Promise<void> {
    // Update is same as write in this implementation
    await this.storageClient.write(filePath, content);
  }

  /**
   * Delete a file
   *
   * @param filePath - File path to delete
   * @returns {Promise<void>} Promise resolving when file is deleted
   */
  async deleteFile(filePath: string): Promise<void> {
    await this.storageClient.delete(filePath);
  }

  /**
   * Move/rename a file from source to destination
   *
   * @param srcPath - Source file path
   * @param destPath - Destination file path
   * @returns {Promise<void>} Promise resolving when file is moved
   */
  async moveFile(srcPath: string, destPath: string): Promise<void> {
    const root = this.storageClient.getRoot();
    const fullSrcPath = path.join(root, srcPath);
    const fullDestPath = path.join(root, destPath);
    const destDirectory = path.dirname(fullDestPath);

    // Ensure destination directory exists
    await fs.mkdir(destDirectory, { recursive: true });

    // Rename/move file
    await fs.rename(fullSrcPath, fullDestPath);
  }

  /**
   * Create a new folder/directory
   *
   * @param folderPath - Folder path to create
   * @returns {Promise<void>} Promise resolving when folder is created
   */
  async createFolder(folderPath: string): Promise<void> {
    const root = this.storageClient.getRoot();
    const fullPath = path.join(root, folderPath);

    await fs.mkdir(fullPath, { recursive: true });
  }

  /**
   * Delete a folder/directory
   *
   * @param folderPath - Folder path to delete
   * @returns {Promise<void>} Promise resolving when folder is deleted
   */
  async deleteFolder(folderPath: string): Promise<void> {
    const root = this.storageClient.getRoot();
    const fullPath = path.join(root, folderPath);

    await fs.rm(fullPath, { recursive: true, force: true });
  }
}
