/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { IDatabase } from '@/application/interfaces/db.interface';
import { MongoClient, MongoClientOptions } from 'mongodb';
import mongoose from 'mongoose';

/**
 * MongoDBService is responsible for managing the connection to a MongoDB database
 * and providing methods to perform database operations, including transactions.
 */
export class MongoDBService implements IDatabase {
  /**
   * mongodb client instance to interact with the database.
   *
   * @param driver - An instance of MongoClient to interact with MongoDB.
   */
  private dbDriver: MongoClient;

  constructor(driver: MongoClient) {
    this.dbDriver = driver;
  }

  /**
   * Establishes a connection to the MongoDB database using the provided URI and options.
   *
   * @param {string} url - The connection URI for the MongoDB database.
   * @param {MongoClientOptions} options - Optional settings for the MongoDB client connection.
   * @returns {Promise<MongoClient>} A promise that resolves to the connected MongoClient instance.
   * @throws Will throw an error if the connection fails.
   */
  async connection(url: string, options?: MongoClientOptions): Promise<MongoClient> {
    const client = await new MongoClient(url, options).connect();
    client.on('error', (err: Error) => {
      throw err;
    }); 
    return client as unknown as Promise<MongoClient>;
  }

  /**
   * Executes a callback function within a MongoDB transaction.
   * 
   * @param callback - A function containing the operations to be executed within the transaction.
   * @returns The result of the callback function.
   */
  async withTransaction(callback: () => Promise<unknown>): Promise<unknown> {
    try {
      const session = await mongoose.startSession();
      return session.withTransaction(async (session) => {
        return await callback();
      });
    } catch (error) {
      // Handle transaction rollback if necessary
      throw error; // Re-throw the error after handling
    } finally {
      // Clean up resources if necessary
    }
  }
}
