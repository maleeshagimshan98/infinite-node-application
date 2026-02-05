import type { Request, Response } from 'express';
import { BaseController } from '../base.controller';
import { matchedData } from 'express-validator';
import { User } from '../../models/user/user.model';
import ApiResponseUtils from '../../app/utils/api-response/api-response-utils';
import argon2 from 'argon2';
import { CustomerGroup } from '../../models/user/customer-group.model';
import { ErrorResponseMessages } from '../../app/utils/error-response-messages';

class SignupController extends BaseController {
  constructor() {
    super();
  }

  async register(req: Request, res: Response): Promise<Response> {
    const userData = matchedData(req);
    const existingUser = await User.findOne({ 'profile.email': userData.profile.email });

    if (existingUser) {
      return ApiResponseUtils.createResponse(
        ApiResponseUtils.apiErrorResponse(400, 'This email is already associated with another account'),
        res,
      );
    }

    userData.password = await argon2.hash(userData.password);
    const defaultCustomerGroup = await CustomerGroup.findOne({ default: true });

    if (!defaultCustomerGroup) {
      //... TODO - Error - No default customer group is available
    }

    userData.cg_id = defaultCustomerGroup ? defaultCustomerGroup._id : 1;
    userData.status = 'pending_verification';
    const newUser = new User(userData);
    await newUser.save();

    return ApiResponseUtils.createResponse(
      ApiResponseUtils.apiOkResponse(201, false, null, 'User registered successfully', {
        id: newUser._id.toString(),
        profile: newUser.profile,
        status: newUser.status,
      }),
      res,
    );
  }

  async verifyEmail(req: Request, res: Response): Promise<Response> {
    const verifyCred = matchedData(req);

    const user = await User.findOne({ 'profile.email': verifyCred.email }).exec();
    if (!user) {
      return ApiResponseUtils.createResponse(
        ApiResponseUtils.resourceNotFoundErrorResponse(
          ErrorResponseMessages.NOT_FOUND_ERROR('User', 'email', verifyCred.email),
        ),
        res,
      );
    }
    user.status = 'active';
    await user.save();

    return ApiResponseUtils.createResponse(
      ApiResponseUtils.apiOkResponse(200, false, null, 'Email verified successfully'),
      res,
    );
  }
}

export default SignupController;
