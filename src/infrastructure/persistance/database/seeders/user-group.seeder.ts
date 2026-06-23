import { container } from '@/app/core/service.container';
import type { UserGroupService } from '@/domain/user/service/user-group.service';
import type { INewUserGroup } from '@/domain/user/models/user-group';

/**
 * Seeds the database with default user groups using UserGroupService
 * @returns boolean indicating if seeding was successful (true) or skipped (false)
 */
export async function seedUserGroups(): Promise<boolean> {
  try {
    const userGroupService = container.resolve<UserGroupService>('userGroupService');

    const existingDefaultGroup = await userGroupService.getDefaultGroup();
    if (existingDefaultGroup) {
      console.log('   ⏭️  Default user group already exists. Skipping seed.');
      return false;
    }

    const groupsToSeed: INewUserGroup[] = [
      {
        name: 'Default Group',
        description: 'Default user group for new users',
        discount: 0,
        default: true,
      },
      {
        name: 'Premium Members',
        description: 'Premium tier users with 10% discount',
        discount: 10,
        default: false,
      },
      {
        name: 'VIP Members',
        description: 'VIP tier users with 20% discount',
        discount: 20,
        default: false,
      },
    ];

    const createdGroups = [];
    for (const groupData of groupsToSeed) {
      try {
        const result = await userGroupService.create(groupData);
        createdGroups.push({
          name: groupData.name,
          id: result.id,
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          console.log(`   ⏭️  User group "${groupData.name}" already exists. Skipping.`);
        } else {
          throw error;
        }
      }
    }

    if (createdGroups.length > 0) {
      console.log(`   ✅ Successfully seeded ${createdGroups.length} user groups`);
      createdGroups.forEach((group, index) => {
        console.log(`      • Group ${index + 1}: ${group.name}`);
      });
    }

    return createdGroups.length > 0;
  } catch (error) {
    console.error('   ❌ Error seeding user groups:', error);
    throw error;
  }
}

/**
 * Clears all non-default user groups from the database (useful for development/testing)
 */
export async function clearUserGroups(): Promise<void> {
  try {
    const userGroupService = container.resolve<UserGroupService>('userGroupService');

    const allGroups = await userGroupService.list();

    let deletedCount = 0;

    for (const group of allGroups) {
      if (!group.default) {
        try {
          await userGroupService.delete(group.id);
          deletedCount++;
        } catch (error) {
          console.error(
            `   ⚠️  Could not delete group "${group.name}":`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }

    console.log(`Deleted ${deletedCount} user groups from database`);
  } catch (error) {
    console.error('Error clearing user groups:', error);
    throw error;
  }
}
