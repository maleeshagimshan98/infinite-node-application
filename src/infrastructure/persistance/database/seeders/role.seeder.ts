import { container } from '@/app/core/service.container';
import type { RoleService } from '@/domain/auth/service/role.service';
import type { ResourceService } from '@/domain/auth/service/resource.service';
import type { INewRole } from '@/domain/auth/models/role';

/**
 * Seeds the database with default roles using RoleService
 * @returns boolean indicating if seeding was successful (true) or skipped (false)
 */
export async function seedRoles(): Promise<boolean> {
  try {
    const roleService = container.resolve<RoleService>('roleService');
    const resourceService = container.resolve<ResourceService>('resourceService');

    const existingDefaultRole = await roleService.getDefaultRole();
    if (existingDefaultRole) {
      console.log('   ⏭️  Default role already exists. Skipping seed.');
      return false;
    }

    const resources = await resourceService.getAll();
    if (resources.length === 0) {
      console.log('   ⚠️  No resources found. Please seed resources first.');
      return false;
    }

    const rolesToSeed: INewRole[] = [
      {
        name: 'Administrator',
        description: 'Full access to every resource',
        default: false,
        resource_permissions: resources.map((resource) => ({
          resource_id: resource.id,
          permission: { read: true, write: true, update: true, delete: true },
        })),
      },
      {
        name: 'Member',
        description: 'Default role assigned to newly registered users',
        default: true,
        resource_permissions: [],
      },
    ];

    const createdRoles = [];
    for (const roleData of rolesToSeed) {
      try {
        const result = await roleService.create(roleData);
        createdRoles.push({
          name: roleData.name,
          id: result.id,
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          console.log(`   ⏭️  Role "${roleData.name}" already exists. Skipping.`);
        } else {
          throw error;
        }
      }
    }

    if (createdRoles.length > 0) {
      console.log(`   ✅ Successfully seeded ${createdRoles.length} roles`);
      createdRoles.forEach((role, index) => {
        console.log(`      • Role ${index + 1}: ${role.name}`);
      });
    }

    return createdRoles.length > 0;
  } catch (error) {
    console.error('   ❌ Error seeding roles:', error);
    throw error;
  }
}

/**
 * Clears all non-default roles from the database (useful for development/testing)
 */
export async function clearRoles(): Promise<void> {
  try {
    const roleService = container.resolve<RoleService>('roleService');
    const allRoles = await roleService.getAll();

    let deletedCount = 0;

    for (const role of allRoles) {
      if (!role.default) {
        try {
          await roleService.delete(role.id);
          deletedCount++;
        } catch (error) {
          console.error(
            `   ⚠️  Could not delete role "${role.name}":`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }

    console.log(`Deleted ${deletedCount} roles from database`);
  } catch (error) {
    console.error('Error clearing roles:', error);
    throw error;
  }
}
