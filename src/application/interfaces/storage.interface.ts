/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export interface IStorage {
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
   * @returns {Promise<string[]>} Promise resolving to array of file paths
   */
  listFiles(folderPath: string): Promise<string[]>;

  /**
   * Create a new file with given content
   *
   * @param {string} path - File path to create
   * @param {Buffer} content - File content as Buffer
   * @returns {Promise<void>} Promise resolving when file is created
   */
  createFile(path: string, content: Buffer): Promise<void>;

  /**
   * Read file content
   *
   * @param {string} path - File path to read
   * @returns {Promise<Buffer>} Promise resolving to file content as Buffer
   */
  readFile(path: string): Promise<Buffer>;

  /**
   * Update existing file with new content
   *
   * @param {string} path - File path to update
   * @param {Buffer} content - New file content as Buffer
   * @returns {Promise<void>} Promise resolving when file is updated
   */
  updateFile(path: string, content: Buffer): Promise<void>;

  /**
   * Delete a file
   *
   * @param {string} path - File path to delete
   * @returns {Promise<void>} Promise resolving when file is deleted
   */
  deleteFile(path: string): Promise<void>;

  /**
   * Move/rename a file from source to destination
   *
   * @param {string} srcPath - Source file path
   * @param {string} destPath - Destination file path
   * @returns {Promise<void>} Promise resolving when file is moved
   */
  moveFile(srcPath: string, destPath: string): Promise<void>;

  /**
   * Create a new folder/directory
   *
   * @param {string} path - Folder path to create
   * @returns {Promise<void>} Promise resolving when folder is created
   */
  createFolder(path: string): Promise<void>;

  /**
   * Delete a folder/directory
   *
   * @param {string} path - Folder path to delete
   * @returns {Promise<void>} Promise resolving when folder is deleted
   */
  deleteFolder(path: string): Promise<void>;
}
