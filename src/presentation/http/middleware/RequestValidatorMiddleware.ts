import { checkSchema } from 'express-validator';
import { validationResult } from 'express-validator';

import ApiResponseUtils from '@/app/core/utils/api-response/api-response-utils';

import type { NextFunction, Request, Response } from 'express';
import type { Schema, ValidationChain } from 'express-validator';
import type { RunnableValidationChains } from 'express-validator/lib/middlewares/schema';

/**
 * Build a middleware that validates the request against an express-validator schema. An invalid request is
 * answered with a 400 listing the errors; a failure while validating is answered with a generic 500.
 *
 * @param {Schema} schema - The schema to validate the request against.
 * @returns {(req: Request, res: Response, next: NextFunction) => Promise<void>} The middleware.
 */
export const RequestValidatorMiddleware = (schema: Schema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validationChain: RunnableValidationChains<ValidationChain> = checkSchema(schema);
      await Promise.all(validationChain.map((chain) => chain.run(req)));

      const result = validationResult(req);

      if (result.isEmpty()) {
        next();
      } else {
        ApiResponseUtils.createResponse(ApiResponseUtils.requestValidationFailResponse(result.array()), res);
        return;
      }
    } catch (e: unknown) {
      //... log the error
      console.log(e);
      ApiResponseUtils.createResponse(ApiResponseUtils.getServerErrorAPIResponse(), res);
      return;
    }
  };
};
