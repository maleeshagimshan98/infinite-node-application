/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { asValue, type AwilixContainer } from 'awilix';
import mongoose from 'mongoose';
import type { IMongooseConfig } from '../../config/service/mongoose.config';

export const mongooseServiceLoader = async (container: AwilixContainer, config: IMongooseConfig): Promise<void> => {
  try {
    await mongoose.connect(config.uri, config.options);
    // console.log(`MongoDB connected successfully: ${config.uri}`);
  } catch (error: unknown) {
    console.error(`MongoDB connection error: ${error instanceof Error ? error.message : error}`);
  }

  container.register({
    mongoose: asValue(mongoose),
  });
};
