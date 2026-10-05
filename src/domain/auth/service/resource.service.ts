/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import { NewResource, type Resource } from '@/domain/auth/models/resource';
import type { INewResource } from '@/domain/auth/models/resource';
import type { IResourceRepository } from '@/application/interfaces/repositories/auth/resource.repository.interface';
import type { IRoleRepository } from '@/application/interfaces/repositories/auth/role.repository.interface';
import { BaseDomainService } from '@/domain/base/service/base.domain.service';
import { DomainServiceError } from '@/domain/base/service/domain-service.error';
import type { TransactionOptions } from '@/application/interfaces/database-mapper.interface';

/**
 * Resource Service
 *
 * Handles all business logic related to RBAC resource (permission catalog entry) management,
 * including creation, updates, and deletion.
 *
 * @extends BaseDomainService
 */
export class ResourceService extends BaseDomainService {
  private readonly resourceRepository: IResourceRepository;
  private readonly roleRepository: IRoleRepository;

  constructor(resourceRepository: IResourceRepository, roleRepository: IRoleRepository) {
    super();
    this.resourceRepository = resourceRepository;
    this.roleRepository = roleRepository;
  }

  /**
   * Get a resource by its id.
   *
   * @param {string} id - The resource id.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<Resource>} The matching resource.
   * @throws {DomainServiceError} NOT_FOUND when no resource exists with the given id.
   * @throws {DomainServiceError} VALIDATION_ERROR when the id is malformed.
   */
  async getById(id: string, transactionOptions?: TransactionOptions): Promise<Resource> {
    return this.wrapInfrastructureErrors(async () => {
      const resource = await this.resourceRepository.findById(id, transactionOptions);
      if (!resource) {
        throw new DomainServiceError(`The Resource with the id equal to ${id} could not be found.`, 'NOT_FOUND');
      }
      return resource;
    });
  }

  /**
   * Get a resource by its name.
   *
   * @param {string} name - The resource name.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<Resource | null>} The matching resource, or null if none exists.
   */
  async getByName(name: string, transactionOptions?: TransactionOptions): Promise<Resource | null> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.resourceRepository.findOne({ name }, undefined, transactionOptions);
    });
  }

  /**
   * Get all resources, optionally paginated.
   *
   * @param {number} [limit] - Maximum number of resources to return.
   * @param {number} [offset] - Number of resources to skip.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<Resource[]>} The matching resources.
   */
  async getAll(limit?: number, offset?: number, transactionOptions?: TransactionOptions): Promise<Resource[]> {
    return this.wrapInfrastructureErrors(async () => {
      return await this.resourceRepository.find({}, limit, offset, undefined, transactionOptions);
    });
  }

  /**
   * Create a new resource.
   *
   * @param {INewResource} data - The resource data.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<Resource>} The created resource.
   * @throws {DomainServiceError} ALREADY_EXISTS when a resource with the same name already exists.
   */
  async create(data: INewResource, transactionOptions?: TransactionOptions): Promise<Resource> {
    return this.wrapInfrastructureErrors(async () => {
      const existingResource = await this.getByName(data.name, transactionOptions);
      if (existingResource) {
        throw new DomainServiceError(
          `The Resource with the name equal to ${data.name} already exists.`,
          'ALREADY_EXISTS',
        );
      }

      return await this.resourceRepository.create(new NewResource(data), transactionOptions);
    });
  }

  /**
   * Update a resource by its id.
   *
   * @param {string} id - The resource id.
   * @param {Partial<INewResource>} data - The fields to update.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<Resource>} The updated resource.
   * @throws {DomainServiceError} NOT_FOUND when no resource exists with the given id.
   * @throws {DomainServiceError} ALREADY_EXISTS when renaming to a name already used by another resource.
   * @throws {DomainServiceError} VALIDATION_ERROR when the id is malformed.
   */
  async update(id: string, data: Partial<INewResource>, transactionOptions?: TransactionOptions): Promise<Resource> {
    return this.wrapInfrastructureErrors(async () => {
      const existingResource = await this.getById(id, transactionOptions);

      if (data.name && data.name !== existingResource.name) {
        const duplicateResource = await this.getByName(data.name, transactionOptions);
        if (duplicateResource) {
          throw new DomainServiceError(
            `The Resource with the name equal to ${data.name} already exists.`,
            'ALREADY_EXISTS',
          );
        }
      }

      Object.assign(existingResource, data);
      const updatedResource = await this.resourceRepository.update(id, existingResource, transactionOptions);

      if (!updatedResource) {
        throw new DomainServiceError(`The Resource with the id equal to ${id} could not be found.`, 'NOT_FOUND');
      }
      return updatedResource;
    });
  }

  /**
   * Delete a resource by its id.
   *
   * @param {string} id - The resource id.
   * @param {TransactionOptions} [transactionOptions] - Optional MongoDB session for transaction support.
   * @returns {Promise<Resource>} The deleted resource.
   * @throws {DomainServiceError} NOT_FOUND when no resource exists with the given id.
   * @throws {DomainServiceError} VALIDATION_ERROR when the id is malformed, or the resource is still granted by a role.
   */
  async delete(id: string, transactionOptions?: TransactionOptions): Promise<Resource> {
    return this.wrapInfrastructureErrors(async () => {
      await this.getById(id, transactionOptions);

      const roles = await this.roleRepository.find({}, undefined, undefined, undefined, transactionOptions);
      if (roles.some((role) => role.resource_ids.includes(id))) {
        throw new DomainServiceError(
          'Cannot delete resource because it is still granted by a role. Please remove it from every role first.',
          'VALIDATION_ERROR',
        );
      }

      const deletedResource = await this.resourceRepository.delete(id, transactionOptions);
      if (!deletedResource) {
        throw new DomainServiceError(`The Resource with the id equal to ${id} could not be deleted.`, 'NOT_FOUND');
      }
      return deletedResource;
    });
  }
}

export default ResourceService;
