import { container } from '@/app/core/service.container';
import type { CustomerGroupService } from '@/domain/user/service/customer-group.service';
import type { INewCustomerGroup } from '@/domain/user/models/customer-group';

/**
 * Seeds the database with default customer groups using CustomerGroupService
 * @returns boolean indicating if seeding was successful (true) or skipped (false)
 */
export async function seedCustomerGroups(): Promise<boolean> {
  try {
    // Resolve CustomerGroupService from the container
    const customerGroupService = container.resolve<CustomerGroupService>('customerGroupService');

    // Check if default group already exists
    const existingDefaultGroup = await customerGroupService.getDefaultGroup();
    if (existingDefaultGroup) {
      console.log('   ⏭️  Default customer group already exists. Skipping seed.');
      return false;
    }

    // Define customer groups to seed
    const groupsToSeed: INewCustomerGroup[] = [
      {
        name: 'Default Group',
        description: 'Default customer group for new users',
        discount: 0,
        default: true,
      },
      {
        name: 'Premium Members',
        description: 'Premium tier customers with 10% discount',
        discount: 10,
        default: false,
      },
      {
        name: 'VIP Members',
        description: 'VIP tier customers with 20% discount',
        discount: 20,
        default: false,
      },
    ];

    // Create customer groups using CustomerGroupService
    const createdGroups = [];
    for (const groupData of groupsToSeed) {
      try {
        const result = await customerGroupService.create(groupData);
        createdGroups.push({
          name: groupData.name,
          id: result.id,
        });
      } catch (error) {
        // If group already exists, skip it
        if (error instanceof Error && error.message.includes('already exists')) {
          console.log(`   ⏭️  Customer group "${groupData.name}" already exists. Skipping.`);
        } else {
          throw error;
        }
      }
    }

    if (createdGroups.length > 0) {
      console.log(`   ✅ Successfully seeded ${createdGroups.length} customer groups`);

      // Display created groups
      createdGroups.forEach((group, index) => {
        console.log(`      • Group ${index + 1}: ${group.name}`);
      });
    }

    return createdGroups.length > 0;
  } catch (error) {
    console.error('   ❌ Error seeding customer groups:', error);
    throw error;
  }
}

/**
 * Clears all non-default customer groups from the database (useful for development/testing)
 */
export async function clearCustomerGroups(): Promise<void> {
  try {
    // Resolve CustomerGroupService from the container
    const customerGroupService = container.resolve<CustomerGroupService>('customerGroupService');

    // Get all customer groups
    const allGroups = await customerGroupService.list();

    let deletedCount = 0;

    // Delete all non-default groups
    for (const group of allGroups) {
      if (!group.default) {
        try {
          await customerGroupService.delete(group.id);
          deletedCount++;
        } catch (error) {
          console.error(
            `   ⚠️  Could not delete group "${group.name}":`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }

    console.log(`Deleted ${deletedCount} customer groups from database`);
  } catch (error) {
    console.error('Error clearing customer groups:', error);
    throw error;
  }
}
