import path from 'path';

import dotenv from 'dotenv';

import { container, autoRegisterApplicationComponents } from '@/app/core/service.container';
import { InfrastructureManager } from '@/infrastructure/infrastructure.manager';

import { seedUsers } from './user.seeder';
import { seedUserGroups } from './user-group.seeder';
import { seedResources } from './resource.seeder';
import { seedRoles } from './role.seeder';

/**
 * Initialize the DI container: register all infrastructure services via InfrastructureManager,
 * then auto-register application services, repositories, and controllers.
 * Database connection is handled by DatabaseMapperService, one of the registered infra services.
 */
async function initializeServices(): Promise<void> {
  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 Initializing Service Container...');

    // Register infrastructure services (logger, cache, email, database mapper, etc.). Uses
    // initForWorker() (not init()) because the seeder is a one-shot CLI script with no HTTP
    // server — init() would also load SocketServiceFactory, which requires an `httpServer`
    // already registered in the container.
    const infrastructureManager = new InfrastructureManager();
    await infrastructureManager.initForWorker(container);
    console.log('✅ Infrastructure Services Registered');

    // Register application components (services, repositories, controllers)
    autoRegisterApplicationComponents();
    console.log('✅ Application Components Registered');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('\n❌ Failed to Initialize Services');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
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
    // Step 1: Initialize services (includes database connection via DatabaseMapperService)
    console.log('📍 Step 1/2: Service Container Initialization');
    await initializeServices();

    // Step 2: Run all seeders
    console.log('📍 Step 2/2: Running Seeders');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('🔹 Seeding Resources...');
    const resourcesSeeded = await seedResources();
    const resourceStatus = resourcesSeeded ? '✅ Successfully Seeded' : '⏭️  Skipped (Already Exists)';
    console.log(`   ${resourceStatus}\n`);

    console.log('🔹 Seeding Roles...');
    const rolesSeeded = await seedRoles();
    const roleStatus = rolesSeeded ? '✅ Successfully Seeded' : '⏭️  Skipped (Already Exists)';
    console.log(`   ${roleStatus}\n`);

    console.log('🔹 Seeding User Groups...');
    const groupsSeeded = await seedUserGroups();
    const groupStatus = groupsSeeded ? '✅ Successfully Seeded' : '⏭️  Skipped (Already Exists)';
    console.log(`   ${groupStatus}\n`);

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
    // Step 1: Initialize services (includes database connection via DatabaseMapperService)
    console.log('📍 Step 1/2: Service Container Initialization');
    await initializeServices();

    // Step 2: Clear all data
    console.log('📍 Step 2/2: Clearing Data');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const { clearUsers } = await import('./user.seeder');
    const { clearUserGroups } = await import('./user-group.seeder');
    const { clearRoles } = await import('./role.seeder');
    const { clearResources } = await import('./resource.seeder');

    console.log('🔹 Clearing Users...');
    await clearUsers();
    console.log('✅ Users Cleared Successfully\n');

    console.log('🔹 Clearing User Groups...');
    await clearUserGroups();
    console.log('✅ User Groups Cleared Successfully\n');

    console.log('🔹 Clearing Roles...');
    await clearRoles();
    console.log('✅ Roles Cleared Successfully\n');

    console.log('🔹 Clearing Resources...');
    await clearResources();
    console.log('✅ Resources Cleared Successfully\n');

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
  }
}

/**
 * CLI Handler - Allows running seeders from command line
 * Usage: npm run seed
 * Usage: npm run seed:clear
 */
async function main(): Promise<void> {
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  dotenv.config({
    path: path.resolve(__dirname, `../../../../../.env.${process.env.NODE_ENV}`),
  });
  dotenv.config(); // Load environment variables from .env file
  // Get command line arguments passed to ts-node
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === '--clear') {
      await clearAllSeeders();
    } else {
      await runAllSeeders();
    }
    // Exit successfully (necessary to close the MongoDB connection and terminate the process)
    process.exit(0);
  } catch {
    process.exit(1);
  }
}

// Execute if this file is run directly
if (require.main === module) {
  main();
}
