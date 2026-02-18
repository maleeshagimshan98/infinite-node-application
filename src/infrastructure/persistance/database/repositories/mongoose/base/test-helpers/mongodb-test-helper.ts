/**
 * MongoDB Test Helper
 *
 * Provides utilities for setting up and tearing down MongoDB connections
 * for integration tests using a real MongoDB database.
 *
 * IMPORTANT: Always use a separate test database to avoid data loss!
 * Set MONGODB_TEST_URI environment variable or it will default to:
 * mongodb://localhost:27017/infinite-node-application-test
 */

import mongoose from 'mongoose';

/**
 * Connect to the real MongoDB test database
 *
 * Uses MONGODB_TEST_URI environment variable or defaults to local test database.
 *
 * @returns {Promise<void>}
 */
export const connectToTestDB = async (): Promise<void> => {
  // Get MongoDB URI from environment variable or use default test database
  const uri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/infinite-node-application-test';

  // Only connect if not already connected
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
};

/**
 * Clear all data from all collections
 *
 * @returns {Promise<void>}
 */
export const clearTestDB = async (): Promise<void> => {
  if (!mongoose.connection.db) {
    throw new Error('Database connection not established');
  }

  const collections = mongoose.connection.collections;

  for (const key in collections) {
    const collection = collections[key];
    if (!collection) {
      continue;
    }
    await collection.deleteMany({});
  }
};

/**
 * Close the database connection
 *
 * @returns {Promise<void>}
 */
export const disconnectFromTestDB = async (): Promise<void> => {
  await mongoose.disconnect();
};

/**
 * Drop the entire database
 *
 * @returns {Promise<void>}
 */
export const dropTestDB = async (): Promise<void> => {
  if (!mongoose.connection.db) {
    throw new Error('Database connection not established');
  }

  await mongoose.connection.db.dropDatabase();
};
