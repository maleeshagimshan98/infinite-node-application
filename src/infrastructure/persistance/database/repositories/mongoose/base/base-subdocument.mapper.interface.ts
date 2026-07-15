/**
 * Copyright - 2026 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

export interface IBaseSubDocumentMapper<DBSchema, DomainModel, NewDomainModel> {
  /**
   * Convert raw sub-document data to the constructor-interface shape of the child domain model.
   * Unlike the root mapper, there is no `_id` intersection — a sub-document may or may not have
   * an `_id`, so its presence is handled inside the concrete mapper.
   *
   * @param {DBSchema} data - An interface representing the raw sub-document data from the database
   * @returns {DomainModel} An object with the child domain model's constructor-interface shape
   */
  toDomain: (data: DBSchema) => DomainModel;

  /**
   * Convert a child domain model instance to the embedded sub-document persistence shape.
   *
   * @param {NewDomainModel} data - An instance of the child domain model class
   * @returns {DBSchema} A plain object representing the sub-document to embed in the root document
   */
  toPersistence: (data: NewDomainModel) => DBSchema;
}
