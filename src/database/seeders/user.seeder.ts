import argon2 from 'argon2';
import { User } from '../../models/user/user.model';
import { CustomerGroup } from '../../models/user/customer-group.model';

/**
 * Seeds the database with sample users
 * @returns boolean indicating if seeding was successful (true) or skipped (false)
 */
export async function seedUsers(): Promise<boolean> {
  try {
    // Check if users already exist
    const existingUsers = await User.countDocuments();
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
        profile: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          address: [
            {
              st_line_1: '123 Main Street',
              st_line_2: 'Apt 4B',
              city: 'New York',
              state: 'NY',
              country: 'USA',
              zipcode: '10001',
              is_billing_address: true,
            },
          ],
          phone: '+1-555-0101',
          profile_img: 'https://via.placeholder.com/150',
        },
        password: hashedPassword,
        status: 'active' as const,
        cg_id: defaultGroup._id.toString(),
      },
      {
        profile: {
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com',
          address: [
            {
              st_line_1: '456 Oak Avenue',
              city: 'Los Angeles',
              state: 'CA',
              country: 'USA',
              zipcode: '90001',
              is_billing_address: true,
            },
          ],
          phone: '+1-555-0102',
          profile_img: 'https://via.placeholder.com/150',
        },
        password: hashedPassword,
        status: 'active' as const,
        cg_id: defaultGroup._id.toString(),
      },
      {
        profile: {
          first_name: 'Bob',
          last_name: 'Johnson',
          email: 'bob@example.com',
          address: [
            {
              st_line_1: '789 Pine Road',
              st_line_2: 'Suite 200',
              city: 'Chicago',
              state: 'IL',
              country: 'USA',
              zipcode: '60601',
              is_billing_address: true,
            },
          ],
          phone: '+1-555-0103',
        },
        password: hashedPassword,
        status: 'pending_verification' as const,
        cg_id: defaultGroup._id.toString(),
      },
    ];

    // Insert users
    const createdUsers = await User.insertMany(usersToSeed);
    console.log(`   ✅ Successfully seeded ${createdUsers.length} users`);

    // Display created users
    createdUsers.forEach((user, index) => {
      console.log(
        `      • User ${index + 1}: ${user.profile.first_name} ${user.profile.last_name} (${user.profile.email})`,
      );
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
    const result = await User.deleteMany({});
    console.log(`Deleted ${result.deletedCount} users from database`);
  } catch (error) {
    console.error('Error clearing users:', error);
    throw error;
  }
}
