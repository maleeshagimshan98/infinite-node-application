import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../app/utils/request/authenticated-request';
import APIResponseUtils from '../app/utils/api-response/api-response-utils';
import { LoginRecord } from '../models/auth/login-record.model';
import type { INewUser } from '../models/user/user.model';
import { User } from '../models/user/user.model';

export const UserValidatorMiddleware = (): ((
  req: AuthenticatedRequest<INewUser>,
  res: Response,
  next: NextFunction,
) => Promise<void>) => {
  return async (req: AuthenticatedRequest<INewUser>, res: Response, next: NextFunction): Promise<void> => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      const apiResponse = APIResponseUtils.noAuthorizationHeaderFoundResponse();
      res.status(apiResponse.getCode()).send(apiResponse.toJson());
      return;
    }
    const loginRecord = await LoginRecord.findOne({ token });
    if (!loginRecord) {
      const apiResponse = APIResponseUtils.invalidAuthorizationHeaderResponse();
      res.status(apiResponse.getCode()).send(apiResponse.toJson());
      return;
    }

    if (loginRecord.status !== 'active') {
      const apiResponse = APIResponseUtils.expiredAuthorizationHeaderResponse();
      APIResponseUtils.createResponse(apiResponse, res);
      return;
    }

    if (loginRecord.valid_till < new Date(new Date().getTime())) {
      loginRecord.status = 'expired';
      await loginRecord.save();
      const apiResponse = APIResponseUtils.expiredAuthorizationHeaderResponse();
      APIResponseUtils.createResponse(apiResponse, res);
      return;
    }

    const user = await User.findById(loginRecord?.user_id);
    if (!user) {
      const apiResponse = APIResponseUtils.invalidAuthorizationHeaderResponse();
      res.status(apiResponse.getCode()).send(apiResponse.toJson());
      return;
    }
    req.user = user;
    next();
  };
};
