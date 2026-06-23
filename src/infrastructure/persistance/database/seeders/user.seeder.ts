import { container } from '@/app/core/service.container';
import { UserModel } from '@/infrastructure/persistance/database/repositories/mongoose/user/user.model';
import type { SignupService } from '@/domain/auth/service/signup.service';
import type { UserGroupService } from '@/domain/user/service/user-group.service';
import type { INewUser } from '@/domain/user/models/user';

/**
 * Seeds the database with sample users using SignupService
 * @returns boolean indicating if seeding was successful (true) or skipped (false)
 */
export async function seedUsers(): Promise<boolean> {
  try {
    // Resolve services from the container
    const signupService = container.resolve<SignupService>('signupService');
    const userGroupService = container.resolve<UserGroupService>('userGroupService');

    // Ensure default customer group exists
    const defaultGroup = await userGroupService.getDefaultGroup();
    if (!defaultGroup) {
      console.log('   ⚠️  No default customer group found. Please seed customer groups first.');
      return false;
    }

    // Define users to seed
    const usersToSeed: INewUser[] = [
      {
        email: 'john@example.com',
        password: 'password123',
        status: 'pending_verification',
        ug_id: defaultGroup.id,
      },
      {
        email: 'jane@example.com',
        password: 'password123',
        status: 'pending_verification',
        ug_id: defaultGroup.id,
      },
      {
        email: 'bob@example.com',
        password: 'password123',
        status: 'pending_verification',
        ug_id: defaultGroup.id,
      },
    ];

    // Register users using SignupService
    const createdUsers = [];
    const skippedUsers = [];

    for (const userData of usersToSeed) {
      try {
        const result = await signupService.register(userData);
        createdUsers.push({
          email: userData.email,
          id: result.id,
          status: result.status,
        });
      } catch (error) {
        // If user already exists, skip it
        if (error instanceof Error && error.message.includes('already associated')) {
          skippedUsers.push(userData.email);
        } else {
          throw error;
        }
      }
    }

    if (createdUsers.length > 0) {
      console.log(`   ✅ Successfully seeded ${createdUsers.length} users`);

      // Display created users
      createdUsers.forEach((user, index) => {
        console.log(`      • User ${index + 1}: ${user.email} (${user.status})`);
      });
    }

    if (skippedUsers.length > 0) {
      console.log(`   ⏭️  Skipped ${skippedUsers.length} existing users`);
    }

    return createdUsers.length > 0;
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
