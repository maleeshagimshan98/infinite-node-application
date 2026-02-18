import argon2 from 'argon2';

import { UserModel } from '@/infrastructure/persistance/database/repositories/mongoose/user/user.model';
import { CustomerGroup } from '@/infrastructure/persistance/database/repositories/mongoose/customer-groups/customer-group.model';

/**
 * Seeds the database with sample users
 * @returns boolean indicating if seeding was successful (true) or skipped (false)
 */
export async function seedUsers(): Promise<boolean> {
  try {
    // Check if users already exist
    const existingUsers = await UserModel.countDocuments();
    if (existingUsers > 0) {
      console.log('   ⏭️  Users already exist in database. Skipping seed.');
      return false;
    }

    // Get or create a default customer group
    let defaultGroup = await CustomerGroup.findOne({ default: true });
    if (!defaultGroup) {
      defaultGroup = await CustomerGroup.create({
        name: 'Default Group',
        description: 'Default customer group',
        discount: 0,
        default: true,
      });
      console.log('   ℹ️  Created default customer group');
    }

    // Hash password for users (password: 'password123') using Argon2
    const hashedPassword = await argon2.hash('password123');

    const usersToSeed = [
      {
        email: 'john@example.com',
        password: hashedPassword,
        status: 'active' as const,
        cg_id: defaultGroup._id.toString(),
      },
      {
        email: 'jane@example.com',
        password: hashedPassword,
        status: 'active' as const,
        cg_id: defaultGroup._id.toString(),
      },
      {
        email: 'bob@example.com',
        password: hashedPassword,
        status: 'pending_verification' as const,
        cg_id: defaultGroup._id.toString(),
      },
    ];

    // Insert users
    const createdUsers = await UserModel.insertMany(usersToSeed);
    console.log(`   ✅ Successfully seeded ${createdUsers.length} users`);

    // Display created users
    createdUsers.forEach((user, index) => {
      console.log(`      • User ${index + 1}: ${user.email}`);
    });

    return true;
  } catch (error) {
    console.error('   ❌ Error seeding users:', error);
    throw error;
  }
}

/**
 * Clears all users from the database (useful for development/testing)
 */
export async function clearUsers(): Promise<void> {
  try {
    const result = await UserModel.deleteMany({});
    console.log(`Deleted ${result.deletedCount} users from database`);
  } catch (error) {
    console.error('Error clearing users:', error);
    throw error;
  }
}
