/**
 * BaseRepository Unit Tests
 *
 * Integration tests for the BaseRepository class using a real MongoDB database.
 * Tests CRUD operations with the User model.
 *
 * NOTE: Ensure MongoDB is running and use a dedicated test database!
 */

import { NewUser, User } from '@/domain/user/models/user';

import { UserRepository } from '../user/user.repository';
import { connectToTestDB, clearTestDB, disconnectFromTestDB } from './test-helpers/mongodb-test-helper';

describe('BaseRepository', () => {
  let userRepository: UserRepository;

  // Connect to the test database before all tests
  beforeAll(async () => {
    await connectToTestDB();
  });

  // Clear all data before each test to ensure test isolation
  beforeEach(async () => {
    await clearTestDB();
    userRepository = new UserRepository();
  });

  // Disconnect from the test database after all tests
  afterAll(async () => {
    await disconnectFromTestDB();
  });

  describe('create', () => {
    it('should create a new user document in the database', async () => {
      // Arrange
      const newUser = new NewUser({
        email: 'test@example.com',
        password: 'hashedPassword123',
        status: 'pending_verification',
        cg_id: 'customer-group-1',
      });

      // Act
      const createdUser = await userRepository.create(newUser);

      // Assert
      expect(createdUser).toBeDefined();
      expect(createdUser.email).toBe(newUser.email);
      expect(createdUser.password).toBe(newUser.password);
      expect(createdUser.status).toBe(newUser.status);
      expect(createdUser.cg_id).toBe(newUser.cg_id);
    });

    it('should auto-generate an id for the created document', async () => {
      // Arrange
      const newUser = new NewUser({
        email: 'test2@example.com',
        password: 'hashedPassword456',
        status: 'active',
        cg_id: 'customer-group-2',
      });

      // Act
      const createdUser = await userRepository.create(newUser);

      // Assert
      expect(createdUser.id).toBeDefined();
    });

    it('should set default status to pending_verification if not provided', async () => {
      // Arrange
      const newUser = new NewUser({
        email: 'test3@example.com',
        password: 'hashedPassword789',
        status: 'pending_verification',
        cg_id: 'customer-group-3',
      });

      // Act
      const createdUser = await userRepository.create(newUser);

      // Assert
      expect(createdUser.status).toBe('pending_verification');
    });

    it('should fail to create a user with missing required fields', async () => {
      // Arrange
      const invalidUser = new NewUser({
        email: 'invalid@example.com',
        // Missing password, status, and cg_id - TypeScript will catch this
        password: '',
        status: 'pending_verification',
        cg_id: '',
      });

      // Act & Assert
      await expect(userRepository.create(invalidUser)).rejects.toThrow();
    });

    it('should create multiple users successfully', async () => {
      // Arrange
      const users = [
        new NewUser({
          email: 'user1@example.com',
          password: 'pass1',
          status: 'active',
          cg_id: 'cg-1',
        }),
        new NewUser({
          email: 'user2@example.com',
          password: 'pass2',
          status: 'suspended',
          cg_id: 'cg-2',
        }),
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
      const newUser = new NewUser({
        email: 'findme@example.com',
        password: 'password123',
        status: 'active',
        cg_id: 'cg-find',
      });
      const createdUser = await userRepository.create(newUser);
      const userId = createdUser.id;

      // Act
      const foundUser = await userRepository.findById(userId);

      // Assert
      expect(foundUser).toBeDefined();
      expect(foundUser).not.toBeNull();
      expect(foundUser?.email).toBe(newUser.email);
      expect(foundUser?.id).toBe(userId);
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

    it('should convert mongoose document to domain model', async () => {
      // Arrange
      const newUser = new NewUser({
        email: 'object@example.com',
        password: 'password123',
        status: 'active',
        cg_id: 'cg-object',
      });
      const createdUser = await userRepository.create(newUser);
      const userId = createdUser.id;

      // Act
      const foundUser = await userRepository.findById(userId);

      // Assert
      expect(foundUser).toBeDefined();
      expect(foundUser).toBeInstanceOf(User);
      // Verify it's a domain model, not a Mongoose document
      expect((foundUser as unknown as Record<string, unknown>)?.toObject).toBeUndefined();
      expect((foundUser as unknown as Record<string, unknown>)?.$__).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update a user by their ID', async () => {
      // Arrange
      const newUser = new NewUser({
        email: 'update@example.com',
        password: 'oldPassword',
        status: 'pending_verification',
        cg_id: 'cg-update',
      });
      const createdUser = await userRepository.create(newUser);
      const userId = createdUser.id;

      const updates = new NewUser({
        email: createdUser.email,
        status: 'active',
        password: 'newPassword',
        cg_id: createdUser.cg_id,
      });

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
      const newUser = new NewUser({
        email: 'partial@example.com',
        password: 'password123',
        status: 'active',
        cg_id: 'cg-partial',
      });
      const createdUser = await userRepository.create(newUser);
      const userId = createdUser.id;

      const updates = new NewUser({
        email: 'newemail@example.com',
        password: newUser.password,
        status: newUser.status,
        cg_id: newUser.cg_id,
      });

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
      const updates = new NewUser({
        email: 'test@example.com',
        password: 'password',
        status: 'active',
        cg_id: 'cg-1',
      });

      // Act & Assert
      await expect(userRepository.update(nonExistentId, updates)).rejects.toThrow('Document not found');
    });

    it('should return updated document with new: true option', async () => {
      // Arrange
      const newUser = new NewUser({
        email: 'return@example.com',
        password: 'password123',
        status: 'pending_verification',
        cg_id: 'cg-return',
      });
      const createdUser = await userRepository.create(newUser);
      const userId = createdUser.id;

      const updates = new NewUser({
        email: createdUser.email,
        password: createdUser.password,
        status: 'active',
        cg_id: createdUser.cg_id,
      });

      // Act
      const updatedUser = await userRepository.update(userId, updates);

      // Assert - The returned user should have the updated status
      expect(updatedUser.status).toBe('active');
    });

    it('should convert mongoose document to domain model after update', async () => {
      // Arrange
      const newUser = new NewUser({
        email: 'convert@example.com',
        password: 'password123',
        status: 'pending_verification',
        cg_id: 'cg-convert',
      });
      const createdUser = await userRepository.create(newUser);
      const userId = createdUser.id;

      const updates = new NewUser({
        email: createdUser.email,
        password: createdUser.password,
        status: 'active',
        cg_id: createdUser.cg_id,
      });

      // Act
      const updatedUser = await userRepository.update(userId, updates);

      // Assert - Verify it's a domain model
      expect(updatedUser).toBeInstanceOf(User);
      expect((updatedUser as unknown as Record<string, unknown>)?.toObject).toBeUndefined();
      expect((updatedUser as unknown as Record<string, unknown>)?.$__).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete a user by their ID', async () => {
      // Arrange
      const newUser = new NewUser({
        email: 'delete@example.com',
        password: 'password123',
        status: 'active',
        cg_id: 'cg-delete',
      });
      const createdUser = await userRepository.create(newUser);
      const userId = createdUser.id;

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
      const user1 = new NewUser({
        email: 'user1@example.com',
        password: 'pass1',
        status: 'active',
        cg_id: 'cg-1',
      });
      const user2 = new NewUser({
        email: 'user2@example.com',
        password: 'pass2',
        status: 'active',
        cg_id: 'cg-2',
      });

      const createdUser1 = await userRepository.create(user1);
      const createdUser2 = await userRepository.create(user2);
      const user1Id = createdUser1.id;
      const user2Id = createdUser2.id;

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
      const newUser = new NewUser({
        email: 'workflow@example.com',
        password: 'initialPassword',
        status: 'pending_verification',
        cg_id: 'cg-workflow',
      });
      const createdUser = await userRepository.create(newUser);
      const userId = createdUser.id;

      expect(createdUser.email).toBe('workflow@example.com');

      // Read
      const foundUser = await userRepository.findById(userId);
      expect(foundUser).toBeDefined();
      expect(foundUser?.status).toBe('pending_verification');

      // Update
      const updates = new NewUser({
        email: createdUser.email,
        password: createdUser.password,
        status: 'active',
        cg_id: createdUser.cg_id,
      });
      const updatedUser = await userRepository.update(userId, updates);
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
      const users = Array.from(
        { length: 10 },
        (_, i) =>
          new NewUser({
            email: `concurrent${i}@example.com`,
            password: `password${i}`,
            status: 'active',
            cg_id: `cg-${i}`,
          }),
      );

      // Act - Create all users concurrently
      const createdUsers = await Promise.all(users.map((user) => userRepository.create(user)));

      // Assert
      expect(createdUsers).toHaveLength(10);

      // Verify all users were created with unique IDs
      const uniqueIds = new Set(createdUsers.map((u: User) => u.id));
      expect(uniqueIds.size).toBe(10);
    });
  });
});
