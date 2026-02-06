import type { NextFunction, Request, Response } from 'express';
import type { Schema, ValidationChain } from 'express-validator';
import { checkSchema } from 'express-validator';
import ApiResponseUtils from '@/app/core/utils/api-response/api-response-utils';
import type { RunnableValidationChains } from 'express-validator/lib/middlewares/schema';
import { validationResult } from 'express-validator';

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
