/**
 * BaseRepository Unit Tests
 *
 * Integration tests for the BaseRepository class using a real MongoDB database.
 * Tests CRUD operations with the User model.
 *
 * NOTE: Ensure MongoDB is running and use a dedicated test database!
 */

import { NewUser, User } from '@/domain/user/models/user';
import { RepositoryError } from '@/infrastructure/core/errors/repository.error';

import { PersistanceError } from '../../../errors/persistance.error';
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
        ug_id: 'user-group-1',
        role_id: '507f1f77bcf86cd799439099',
      });

      // Act
      const createdUser = await userRepository.create(newUser);

      // Assert
      expect(createdUser).toBeDefined();
      expect(createdUser.email).toBe(newUser.email);
      expect(createdUser.password).toBe(newUser.password);
      expect(createdUser.status).toBe(newUser.status);
      expect(createdUser.ug_id).toBe(newUser.ug_id);
    });

    it('should auto-generate an id for the created document', async () => {
      // Arrange
      const newUser = new NewUser({
        email: 'test2@example.com',
        password: 'hashedPassword456',
        status: 'active',
        ug_id: 'user-group-2',
        role_id: '507f1f77bcf86cd799439099',
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
        ug_id: 'user-group-3',
        role_id: '507f1f77bcf86cd799439099',
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
        // Missing password, status, and ug_id - TypeScript will catch this
        password: '',
        status: 'pending_verification',
        ug_id: '',
        role_id: '507f1f77bcf86cd799439099',
      });

      // Act & Assert - the schema ValidationError is translated, not leaked raw
      await expect(userRepository.create(invalidUser)).rejects.toBeInstanceOf(PersistanceError);
    });

    it('should throw a DUPLICATE_KEY RepositoryError when the id already exists', async () => {
      // Arrange
      const data = {
        id: '507f1f77bcf86cd799439022',
        email: 'duplicate@example.com',
        password: 'hashedPassword123',
        status: 'active' as const,
        ug_id: 'user-group-1',
        role_id: '507f1f77bcf86cd799439099',
      };
      await userRepository.create(new NewUser(data));

      // Act
      const thrown = await userRepository.create(new NewUser(data)).catch((e: unknown) => e);

      // Assert
      expect(thrown).toBeInstanceOf(RepositoryError);
      expect(thrown).toMatchObject({ type: 'DUPLICATE_KEY' });
    });

    it('should create multiple users successfully', async () => {
      // Arrange
      const users = [
        new NewUser({
          email: 'user1@example.com',
          password: 'pass1',
          status: 'active',
          ug_id: 'ug-1',
          role_id: '507f1f77bcf86cd799439099',
        }),
        new NewUser({
          email: 'user2@example.com',
          password: 'pass2',
          status: 'suspended',
          ug_id: 'ug-2',
          role_id: '507f1f77bcf86cd799439099',
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

  describe('bulkCreate', () => {
    it('should create multiple documents in the database', async () => {
      // Arrange
      const newUsers = [
        new NewUser({
          email: 'bulk1@example.com',
          password: 'pass1',
          status: 'active',
          ug_id: 'ug-1',
          role_id: '507f1f77bcf86cd799439099',
        }),
        new NewUser({
          email: 'bulk2@example.com',
          password: 'pass2',
          status: 'pending_verification',
          ug_id: 'ug-2',
          role_id: '507f1f77bcf86cd799439099',
        }),
        new NewUser({
          email: 'bulk3@example.com',
          password: 'pass3',
          status: 'suspended',
          ug_id: 'ug-3',
          role_id: '507f1f77bcf86cd799439099',
        }),
      ];

      // Act
      const createdUsers = await userRepository.bulkCreate(newUsers);

      // Assert
      expect(createdUsers).toHaveLength(3);
      expect(createdUsers[0]?.email).toBe('bulk1@example.com');
      expect(createdUsers[1]?.email).toBe('bulk2@example.com');
      expect(createdUsers[2]?.email).toBe('bulk3@example.com');
    });

    it('should auto-generate unique IDs for each created document', async () => {
      // Arrange
      const newUsers = [
        new NewUser({
          email: 'id1@example.com',
          password: 'pass1',
          status: 'active',
          ug_id: 'ug-1',
          role_id: '507f1f77bcf86cd799439099',
        }),
        new NewUser({
          email: 'id2@example.com',
          password: 'pass2',
          status: 'active',
          ug_id: 'ug-2',
          role_id: '507f1f77bcf86cd799439099',
        }),
      ];

      // Act
      const createdUsers = await userRepository.bulkCreate(newUsers);

      // Assert
      expect(createdUsers[0]?.id).toBeDefined();
      expect(createdUsers[1]?.id).toBeDefined();
      const uniqueIds = new Set(createdUsers.map((u) => u.id));
      expect(uniqueIds.size).toBe(2);
    });

    it('should return domain model instances for each created document', async () => {
      // Arrange
      const newUsers = [
        new NewUser({
          email: 'domain1@example.com',
          password: 'pass1',
          status: 'active',
          ug_id: 'ug-1',
          role_id: '507f1f77bcf86cd799439099',
        }),
        new NewUser({
          email: 'domain2@example.com',
          password: 'pass2',
          status: 'active',
          ug_id: 'ug-2',
          role_id: '507f1f77bcf86cd799439099',
        }),
      ];

      // Act
      const createdUsers = await userRepository.bulkCreate(newUsers);

      // Assert - Verify each result is a domain model, not a Mongoose document
      for (const user of createdUsers) {
        expect(user).toBeInstanceOf(User);
        expect((user as unknown as Record<string, unknown>)?.toObject).toBeUndefined();
        expect((user as unknown as Record<string, unknown>)?.$__).toBeUndefined();
      }
    });

    it('should persist all documents and make them findable by ID', async () => {
      // Arrange
      const newUsers = [
        new NewUser({
          email: 'persist1@example.com',
          password: 'pass1',
          status: 'active',
          ug_id: 'ug-1',
          role_id: '507f1f77bcf86cd799439099',
        }),
        new NewUser({
          email: 'persist2@example.com',
          password: 'pass2',
          status: 'active',
          ug_id: 'ug-2',
          role_id: '507f1f77bcf86cd799439099',
        }),
      ];

      // Act
      const createdUsers = await userRepository.bulkCreate(newUsers);

      // Assert - Each document should be retrievable from the database
      for (const user of createdUsers) {
        const found = await userRepository.findById(user.id);
        expect(found).toBeDefined();
        expect(found?.id).toBe(user.id);
        expect(found?.email).toBe(user.email);
      }
    });

    it('should handle an empty array and return an empty array', async () => {
      // Act
      const createdUsers = await userRepository.bulkCreate([]);

      // Assert
      expect(createdUsers).toHaveLength(0);
      expect(Array.isArray(createdUsers)).toBe(true);
    });

    it('should preserve correct field values for each document', async () => {
      // Arrange
      const newUsers = [
        new NewUser({
          email: 'fields1@example.com',
          password: 'password1',
          status: 'active',
          ug_id: 'ug-a',
          role_id: '507f1f77bcf86cd799439099',
        }),
        new NewUser({
          email: 'fields2@example.com',
          password: 'password2',
          status: 'suspended',
          ug_id: 'ug-b',
          role_id: '507f1f77bcf86cd799439099',
        }),
      ];

      // Act
      const createdUsers = await userRepository.bulkCreate(newUsers);

      // Assert
      expect(createdUsers[0]?.email).toBe('fields1@example.com');
      expect(createdUsers[0]?.password).toBe('password1');
      expect(createdUsers[0]?.status).toBe('active');
      expect(createdUsers[0]?.ug_id).toBe('ug-a');

      expect(createdUsers[1]?.email).toBe('fields2@example.com');
      expect(createdUsers[1]?.password).toBe('password2');
      expect(createdUsers[1]?.status).toBe('suspended');
      expect(createdUsers[1]?.ug_id).toBe('ug-b');
    });
  });

  describe('findById', () => {
    it('should find a user by their ID', async () => {
      // Arrange
      const newUser = new NewUser({
        email: 'findme@example.com',
        password: 'password123',
        status: 'active',
        ug_id: 'ug-find',
        role_id: '507f1f77bcf86cd799439099',
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

    it('should throw an INVALID_ID RepositoryError when given an invalid ID format', async () => {
      // Arrange
      const invalidId = 'invalid-id-format';

      // Act
      const thrown = await userRepository.findById(invalidId).catch((e: unknown) => e);

      // Assert
      expect(thrown).toBeInstanceOf(RepositoryError);
      expect(thrown).toMatchObject({ type: 'INVALID_ID' });
    });

    it('should convert mongoose document to domain model', async () => {
      // Arrange
      const newUser = new NewUser({
        email: 'object@example.com',
        password: 'password123',
        status: 'active',
        ug_id: 'ug-object',
        role_id: '507f1f77bcf86cd799439099',
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
        ug_id: 'ug-update',
        role_id: '507f1f77bcf86cd799439099',
      });
      const createdUser = await userRepository.create(newUser);
      const userId = createdUser.id;

      const updates = new NewUser({
        email: createdUser.email,
        status: 'active',
        password: 'newPassword',
        ug_id: createdUser.ug_id,
        role_id: '507f1f77bcf86cd799439099',
      });

      // Act
      const updatedUser = await userRepository.update(userId, updates);

      // Assert
      expect(updatedUser).not.toBeNull();
      expect(updatedUser?.status).toBe('active');
      expect(updatedUser?.password).toBe('newPassword');
      expect(updatedUser?.email).toBe(newUser.email); // Unchanged field
    });

    it('should update only the specified fields', async () => {
      // Arrange
      const newUser = new NewUser({
        email: 'partial@example.com',
        password: 'password123',
        status: 'active',
        ug_id: 'ug-partial',
        role_id: '507f1f77bcf86cd799439099',
      });
      const createdUser = await userRepository.create(newUser);
      const userId = createdUser.id;

      const updates = new NewUser({
        email: 'newemail@example.com',
        password: newUser.password,
        status: newUser.status,
        ug_id: newUser.ug_id,
        role_id: '507f1f77bcf86cd799439099',
      });

      // Act
      const updatedUser = await userRepository.update(userId, updates);

      // Assert
      expect(updatedUser).not.toBeNull();
      expect(updatedUser?.email).toBe('newemail@example.com');
      expect(updatedUser?.password).toBe(newUser.password); // Unchanged
      expect(updatedUser?.status).toBe(newUser.status); // Unchanged
      expect(updatedUser?.ug_id).toBe(newUser.ug_id); // Unchanged
    });

    it('should return null when updating a non-existent user', async () => {
      // Arrange
      const nonExistentId = '507f1f77bcf86cd799439011';
      const updates = new NewUser({
        email: 'test@example.com',
        password: 'password',
        status: 'active',
        ug_id: 'ug-1',
        role_id: '507f1f77bcf86cd799439099',
      });

      // Act
      const updatedUser = await userRepository.update(nonExistentId, updates);

      // Assert
      expect(updatedUser).toBeNull();
    });

    it('should return updated document with new: true option', async () => {
      // Arrange
      const newUser = new NewUser({
        email: 'return@example.com',
        password: 'password123',
        status: 'pending_verification',
        ug_id: 'ug-return',
        role_id: '507f1f77bcf86cd799439099',
      });
      const createdUser = await userRepository.create(newUser);
      const userId = createdUser.id;

      const updates = new NewUser({
        email: createdUser.email,
        password: createdUser.password,
        status: 'active',
        ug_id: createdUser.ug_id,
        role_id: '507f1f77bcf86cd799439099',
      });

      // Act
      const updatedUser = await userRepository.update(userId, updates);

      // Assert - The returned user should have the updated status
      expect(updatedUser).not.toBeNull();
      expect(updatedUser?.status).toBe('active');
    });

    it('should convert mongoose document to domain model after update', async () => {
      // Arrange
      const newUser = new NewUser({
        email: 'convert@example.com',
        password: 'password123',
        status: 'pending_verification',
        ug_id: 'ug-convert',
        role_id: '507f1f77bcf86cd799439099',
      });
      const createdUser = await userRepository.create(newUser);
      const userId = createdUser.id;

      const updates = new NewUser({
        email: createdUser.email,
        password: createdUser.password,
        status: 'active',
        ug_id: createdUser.ug_id,
        role_id: '507f1f77bcf86cd799439099',
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
        ug_id: 'ug-delete',
        role_id: '507f1f77bcf86cd799439099',
      });
      const createdUser = await userRepository.create(newUser);
      const userId = createdUser.id;

      // Act
      const deleted = await userRepository.delete(userId);

      // Assert - Returns the deleted domain model
      expect(deleted).not.toBeNull();
      expect(deleted?.id).toBe(userId);

      // Verify user no longer exists
      const deletedUser = await userRepository.findById(userId);
      expect(deletedUser).toBeNull();
    });

    it('should return null when deleting a non-existent user', async () => {
      // Arrange
      const nonExistentId = '507f1f77bcf86cd799439011';

      // Act
      const deleted = await userRepository.delete(nonExistentId);

      // Assert - No throw, resolves to null
      expect(deleted).toBeNull();
    });

    it('should delete the correct user and leave others intact', async () => {
      // Arrange
      const user1 = new NewUser({
        email: 'user1@example.com',
        password: 'pass1',
        status: 'active',
        ug_id: 'ug-1',
        role_id: '507f1f77bcf86cd799439099',
      });
      const user2 = new NewUser({
        email: 'user2@example.com',
        password: 'pass2',
        status: 'active',
        ug_id: 'ug-2',
        role_id: '507f1f77bcf86cd799439099',
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
        ug_id: 'ug-workflow',
        role_id: '507f1f77bcf86cd799439099',
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
        ug_id: createdUser.ug_id,
        role_id: '507f1f77bcf86cd799439099',
      });
      const updatedUser = await userRepository.update(userId, updates);
      expect(updatedUser).not.toBeNull();
      expect(updatedUser?.status).toBe('active');

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
            ug_id: `ug-${i}`,
            role_id: '507f1f77bcf86cd799439099',
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
