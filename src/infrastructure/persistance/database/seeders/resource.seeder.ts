import { container } from '@/app/core/service.container';
import type { ResourceService } from '@/domain/auth/service/resource.service';
import type { INewResource } from '@/domain/auth/models/resource';

// No `default` flag exists on Resource to key idempotency off, so a canonical seeded resource
// name is used as the existence check instead — mirroring user-group.seeder.ts's shape otherwise.
const CANONICAL_SEEDED_RESOURCE_NAME = 'users';

/**
 * Seeds the database with default resources using ResourceService
 * @returns boolean indicating if seeding was successful (true) or skipped (false)
 */
export async function seedResources(): Promise<boolean> {
  try {
    const resourceService = container.resolve<ResourceService>('resourceService');

    const existingResource = await resourceService.getByName(CANONICAL_SEEDED_RESOURCE_NAME);
    if (existingResource) {
      console.log('   ⏭️  Default resources already exist. Skipping seed.');
      return false;
    }

    const resourcesToSeed: INewResource[] = [
      { name: 'users', description: 'User accounts' },
      { name: 'roles', description: 'RBAC roles' },
      { name: 'resources', description: 'RBAC resources' },
      { name: 'user-groups', description: 'Customer groups' },
    ];

    const createdResources = [];
    for (const resourceData of resourcesToSeed) {
      try {
        const result = await resourceService.create(resourceData);
        createdResources.push({
          name: resourceData.name,
          id: result.id,
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          console.log(`   ⏭️  Resource "${resourceData.name}" already exists. Skipping.`);
        } else {
          throw error;
        }
      }
    }

    if (createdResources.length > 0) {
      console.log(`   ✅ Successfully seeded ${createdResources.length} resources`);
      createdResources.forEach((resource, index) => {
        console.log(`      • Resource ${index + 1}: ${resource.name}`);
      });
    }

    return createdResources.length > 0;
  } catch (error) {
    console.error('   ❌ Error seeding resources:', error);
    throw error;
  }
}

/**
 * Clears all resources from the database (useful for development/testing)
 */
export async function clearResources(): Promise<void> {
  try {
    const resourceService = container.resolve<ResourceService>('resourceService');
    const allResources = await resourceService.getAll();

    let deletedCount = 0;

    for (const resource of allResources) {
      try {
        await resourceService.delete(resource.id);
        deletedCount++;
      } catch (error) {
        console.error(
          `   ⚠️  Could not delete resource "${resource.name}":`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    console.log(`Deleted ${deletedCount} resources from database`);
  } catch (error) {
    console.error('Error clearing resources:', error);
    throw error;
  }
}
