import mongoose from 'mongoose';

import { mongooseConfig } from '@/app/core/config/drivers/mongoose.config';

import { seedUsers } from './user.seeder';

/**
 * Initialize MongoDB connection
 */
async function initializeDatabase(): Promise<void> {
  const config = mongooseConfig();

  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📡 Initializing MongoDB Connection...');
    console.log(`🔗 URI: ${config.uri}`);

    await mongoose.connect(config.uri, config.options);

    console.log('✅ MongoDB Connection Established Successfully');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('\n❌ Failed to Connect to MongoDB');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    throw error;
  }
}

/**
 * Close MongoDB connection
 */
async function closeDatabase(): Promise<void> {
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB Connection Closed');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
    throw error;
  }
}

/**
 * Main seeder function that runs all database seeders
 */
export async function runAllSeeders(): Promise<void> {
  console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║          🌱 DATABASE SEEDING PROCESS STARTED 🌱           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Initialize database connection
    console.log('📍 Step 1/2: Database Connection');
    await initializeDatabase();

    // Step 2: Run all seeders
    console.log('📍 Step 2/2: Running Seeders');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('🔹 Seeding Users...');
    const usersSeeded = await seedUsers();
    const userStatus = usersSeeded ? '✅ Successfully Seeded' : '⏭️  Skipped (Already Exists)';
    console.log(`   ${userStatus}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     ✨ DATABASE SEEDING COMPLETED SUCCESSFULLY ✨          ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('╔═══════════════════════════════════════════════════════════╗');
    console.error('║      ❌ DATABASE SEEDING FAILED ❌                        ║');
    console.error('╚═══════════════════════════════════════════════════════════╝');
    console.error('\nError Details:', error instanceof Error ? error.message : String(error));
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    throw error;
  } finally {
    // Always close the database connection
    await closeDatabase();
  }
}

/**
 * Clear all seeded data (useful for development/testing)
 */
export async function clearAllSeeders(): Promise<void> {
  console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║          🗑️  DATABASE CLEANUP PROCESS STARTED 🗑️            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Initialize database connection
    console.log('📍 Step 1/2: Database Connection');
    await initializeDatabase();

    // Step 2: Clear all data
    console.log('📍 Step 2/2: Clearing Data');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const { clearUsers } = await import('./user.seeder');

    console.log('🔹 Clearing Users...');
    await clearUsers();
    console.log('✅ Users Cleared Successfully\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     ✨ DATABASE CLEANUP COMPLETED SUCCESSFULLY ✨        ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('╔═══════════════════════════════════════════════════════════╗');
    console.error('║      ❌ DATABASE CLEANUP FAILED ❌                       ║');
    console.error('╚═══════════════════════════════════════════════════════════╝');
    console.error('\nError Details:', error instanceof Error ? error.message : String(error));
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    throw error;
  } finally {
    // Always close the database connection
    await closeDatabase();
  }
}

/**
 * CLI Handler - Allows running seeders from command line
 * Usage: npm run seed
 * Usage: npm run seed:clear
 */
async function main(): Promise<void> {
  // Get command line arguments passed to ts-node
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === '--clear') {
      await clearAllSeeders();
    } else {
      await runAllSeeders();
    }
  } catch {
    process.exit(1);
  }
}

// Execute if this file is run directly
if (require.main === module) {
  main();
}
