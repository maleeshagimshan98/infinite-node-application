/**
 * BaseRepository Unit Tests
 *
 * Integration tests for the BaseRepository class using a real MongoDB database.
 * Tests CRUD operations with the User model.
 *
 * NOTE: Ensure MongoDB is running and use a dedicated test database!
 */

import { BaseRepository } from './base-repository';
import { User, type INewUser, type IUser } from '../user/user.model';
import { connectToTestDB, clearTestDB, disconnectFromTestDB } from './test-helpers/mongodb-test-helper';

import type { Types } from 'mongoose';

describe('BaseRepository', () => {
  let userRepository: BaseRepository<INewUser>;

  // Connect to the test database before all tests
  beforeAll(async () => {
    await connectToTestDB();
  });

  // Clear all data before each test to ensure test isolation
  beforeEach(async () => {
    await clearTestDB();
    userRepository = new BaseRepository<INewUser>(User);
  });

  // Disconnect from the test database after all tests
  afterAll(async () => {
    await disconnectFromTestDB();
  });

  describe('create', () => {
    it('should create a new user document in the database', async () => {
      // Arrange
      const newUser: INewUser = {
        email: 'test@example.com',
        password: 'hashedPassword123',
        status: 'pending_verification',
        cg_id: 'customer-group-1',
      };

      // Act
      const createdUser = await userRepository.create(newUser);

      // Assert
      expect(createdUser).toBeDefined();
      expect(createdUser.email).toBe(newUser.email);
      expect(createdUser.password).toBe(newUser.password);
      expect(createdUser.status).toBe(newUser.status);
      expect(createdUser.cg_id).toBe(newUser.cg_id);
    });

    it('should auto-generate an _id for the created document', async () => {
      // Arrange
      const newUser: INewUser = {
        email: 'test2@example.com',
        password: 'hashedPassword456',
        status: 'active',
        cg_id: 'customer-group-2',
      };

      // Act
      const createdUser = await userRepository.create(newUser);

      // Assert
      expect(createdUser._id).toBeDefined();
    });

    it('should set default status to pending_verification if not provided', async () => {
      // Arrange
      const newUser: INewUser = {
        email: 'test3@example.com',
        password: 'hashedPassword789',
        status: 'pending_verification',
        cg_id: 'customer-group-3',
      };

      // Act
      const createdUser = await userRepository.create(newUser);

      // Assert
      expect(createdUser.status).toBe('pending_verification');
    });

    it('should fail to create a user with missing required fields', async () => {
      // Arrange
      const invalidUser = {
        email: 'invalid@example.com',
        // Missing password, status, and cg_id
      } as INewUser;

      // Act & Assert
      await expect(userRepository.create(invalidUser)).rejects.toThrow();
    });

    it('should create multiple users successfully', async () => {
      // Arrange
      const users: INewUser[] = [
        {
          email: 'user1@example.com',
          password: 'pass1',
          status: 'active',
          cg_id: 'cg-1',
        },
        {
          email: 'user2@example.com',
          password: 'pass2',
          status: 'suspended',
          cg_id: 'cg-2',
        },
      ];

      // Act
      const createdUsers = await Promise.all(users.map((user) => userRepository.create(user)));

      // Assert
      expect(createdUsers).toHaveLength(2);
      expect(createdUsers[0]?.email).toBe('user1@example.com');
      expect(createdUsers[1]?.email).toBe('user2@example.com');
    });
  });

  describe('findById', () => {
    it('should find a user by their ID', async () => {
      // Arrange
      const newUser: INewUser = {
        email: 'findme@example.com',
        password: 'password123',
        status: 'active',
        cg_id: 'cg-find',
      };
      const createdUser = await userRepository.create(newUser);
      const userId = (createdUser._id as Types.ObjectId).toString();

      // Act
      const foundUser = await userRepository.findById(userId);

      // Assert
      expect(foundUser).toBeDefined();
      expect(foundUser).not.toBeNull();
      expect(foundUser?.email).toBe(newUser.email);
      expect(foundUser?._id?.toString()).toBe(userId);
    });

    it('should return null when user ID does not exist', async () => {
      // Arrange
      const nonExistentId = '507f1f77bcf86cd799439011'; // Valid ObjectId format

      // Act
      const foundUser = await userRepository.findById(nonExistentId);

      // Assert
      expect(foundUser).toBeNull();
    });

    it('should return null when given an invalid ID format', async () => {
      // Arrange
      const invalidId = 'invalid-id-format';

      // Act & Assert
      // Mongoose will throw an error for invalid ObjectId format
      await expect(userRepository.findById(invalidId)).rejects.toThrow();
    });

    it('should convert mongoose document to plain object', async () => {
      // Arrange
      const newUser: INewUser = {
        email: 'object@example.com',
        password: 'password123',
        status: 'active',
        cg_id: 'cg-object',
      };
      const createdUser = await userRepository.create(newUser);
      const userId = (createdUser._id as Types.ObjectId).toString();

      // Act
      const foundUser = await userRepository.findById(userId);

      // Assert
      expect(foundUser).toBeDefined();
      // Verify it's a plain object, not a Mongoose document
      expect((foundUser as any)?.toObject).toBeUndefined();
      expect((foundUser as any)?.$__).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update a user by their ID', async () => {
      // Arrange
      const newUser: INewUser = {
        email: 'update@example.com',
        password: 'oldPassword',
        status: 'pending_verification',
        cg_id: 'cg-update',
      };
      const createdUser = await userRepository.create(newUser);
      const userId = (createdUser._id as Types.ObjectId).toString();

      const updates: Partial<INewUser> = {
        status: 'active',
        password: 'newPassword',
      };

      // Act
      const updatedUser = await userRepository.update(userId, updates);

      // Assert
      expect(updatedUser).toBeDefined();
      expect(updatedUser.status).toBe('active');
      expect(updatedUser.password).toBe('newPassword');
      expect(updatedUser.email).toBe(newUser.email); // Unchanged field
    });

    it('should update only the specified fields', async () => {
      // Arrange
      const newUser: INewUser = {
        email: 'partial@example.com',
        password: 'password123',
        status: 'active',
        cg_id: 'cg-partial',
      };
      const createdUser = await userRepository.create(newUser);
      const userId = (createdUser._id as Types.ObjectId).toString();

      const updates: Partial<INewUser> = {
        email: 'newemail@example.com',
      };

      // Act
      const updatedUser = await userRepository.update(userId, updates);

      // Assert
      expect(updatedUser.email).toBe('newemail@example.com');
      expect(updatedUser.password).toBe(newUser.password); // Unchanged
      expect(updatedUser.status).toBe(newUser.status); // Unchanged
      expect(updatedUser.cg_id).toBe(newUser.cg_id); // Unchanged
    });

    it('should throw an error when updating a non-existent user', async () => {
      // Arrange
      const nonExistentId = '507f1f77bcf86cd799439011';
      const updates: Partial<INewUser> = {
        status: 'active',
      };

      // Act & Assert
      await expect(userRepository.update(nonExistentId, updates)).rejects.toThrow('Document not found');
    });

    it('should return updated document with new: true option', async () => {
      // Arrange
      const newUser: INewUser = {
        email: 'return@example.com',
        password: 'password123',
        status: 'pending_verification',
        cg_id: 'cg-return',
      };
      const createdUser = await userRepository.create(newUser);
      const userId = (createdUser._id as Types.ObjectId).toString();

      const updates: Partial<INewUser> = {
        status: 'active',
      };

      // Act
      const updatedUser = await userRepository.update(userId, updates);

      // Assert - The returned user should have the updated status
      expect(updatedUser.status).toBe('active');
    });

    it('should convert mongoose document to plain object after update', async () => {
      // Arrange
      const newUser: INewUser = {
        email: 'convert@example.com',
        password: 'password123',
        status: 'pending_verification',
        cg_id: 'cg-convert',
      };
      const createdUser = await userRepository.create(newUser);
      const userId = (createdUser._id as Types.ObjectId).toString();

      const updates: Partial<INewUser> = {
        status: 'active',
      };

      // Act
      const updatedUser = await userRepository.update(userId, updates);

      // Assert - Verify it's a plain object
      expect((updatedUser as any)?.toObject).toBeUndefined();
      expect((updatedUser as any)?.$__).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete a user by their ID', async () => {
      // Arrange
      const newUser: INewUser = {
        email: 'delete@example.com',
        password: 'password123',
        status: 'active',
        cg_id: 'cg-delete',
      };
      const createdUser = await userRepository.create(newUser);
      const userId = (createdUser._id as Types.ObjectId).toString();

      // Act
      await userRepository.delete(userId);

      // Assert - Verify user no longer exists
      const deletedUser = await userRepository.findById(userId);
      expect(deletedUser).toBeNull();
    });

    it('should not throw an error when deleting a non-existent user', async () => {
      // Arrange
      const nonExistentId = '507f1f77bcf86cd799439011';

      // Act & Assert - Should complete without error
      await expect(userRepository.delete(nonExistentId)).resolves.not.toThrow();
    });

    it('should delete the correct user and leave others intact', async () => {
      // Arrange
      const user1: INewUser = {
        email: 'user1@example.com',
        password: 'pass1',
        status: 'active',
        cg_id: 'cg-1',
      };
      const user2: INewUser = {
        email: 'user2@example.com',
        password: 'pass2',
        status: 'active',
        cg_id: 'cg-2',
      };

      const createdUser1 = await userRepository.create(user1);
      const createdUser2 = await userRepository.create(user2);
      const user1Id = (createdUser1._id as Types.ObjectId).toString();
      const user2Id = (createdUser2._id as Types.ObjectId).toString();

      // Act - Delete user1
      await userRepository.delete(user1Id);

      // Assert
      const deletedUser1 = await userRepository.findById(user1Id);
      const existingUser2 = await userRepository.findById(user2Id);

      expect(deletedUser1).toBeNull();
      expect(existingUser2).toBeDefined();
      expect(existingUser2?.email).toBe('user2@example.com');
    });
  });

  describe('Integration - Multiple operations', () => {
    it('should handle a complete CRUD workflow', async () => {
      // Create
      const newUser: INewUser = {
        email: 'workflow@example.com',
        password: 'initialPassword',
        status: 'pending_verification',
        cg_id: 'cg-workflow',
      };
      const createdUser = await userRepository.create(newUser);
      const userId = (createdUser._id as Types.ObjectId).toString();

      expect(createdUser.email).toBe('workflow@example.com');

      // Read
      const foundUser = await userRepository.findById(userId);
      expect(foundUser).toBeDefined();
      expect(foundUser?.status).toBe('pending_verification');

      // Update
      const updatedUser = await userRepository.update(userId, { status: 'active' });
      expect(updatedUser.status).toBe('active');

      // Verify update persisted
      const verifyUser = await userRepository.findById(userId);
      expect(verifyUser?.status).toBe('active');

      // Delete
      await userRepository.delete(userId);

      // Verify deletion
      const deletedUser = await userRepository.findById(userId);
      expect(deletedUser).toBeNull();
    });

    it('should handle concurrent operations safely', async () => {
      // Arrange
      const users: INewUser[] = Array.from({ length: 10 }, (_, i) => ({
        email: `concurrent${i}@example.com`,
        password: `password${i}`,
        status: 'active' as const,
        cg_id: `cg-${i}`,
      }));

      // Act - Create all users concurrently
      const createdUsers = await Promise.all(users.map((user) => userRepository.create(user)));

      // Assert
      expect(createdUsers).toHaveLength(10);

      // Verify all users were created with unique IDs
      const uniqueIds = new Set(createdUsers.map((u) => (u._id as Types.ObjectId).toString()));
      expect(uniqueIds.size).toBe(10);
    });
  });
});
