import type { Request, Response } from 'express';
import { BaseController } from '../BaseController';
import ApiResponseUtils from '../../app/utils/api-response/api-response-utils';
import { User } from '../../models/user/user.model';
import { PasswordResetCodesModel } from '../../models/auth/password-reset-code.model';
import { matchedData } from 'express-validator';
import type { ILoginRecord } from '../../models/auth/login-record.model';
import { LoginRecord } from '../../models/auth/login-record.model';
import type { HydratedDocument } from 'mongoose';
import argon2 from 'argon2';
import { ErrorResponseMessages } from '../../app/utils/error-response-messages';

class AccountRecoveryController extends BaseController {
  constructor() {
    super();
  }

  private async cancellOldResetCodes(email: string): Promise<void> {
    const resetCodes = await PasswordResetCodesModel.find({ email }).exec();
    //... should use a transaction or bulkWrite
    resetCodes.map((resetCode) => {
      resetCode.status = 'cancelled';
      resetCode.save();
    });
  }

  async forgotPassword(req: Request, res: Response): Promise<Response> {
    const email = req.body.email;
    const user = await User.findOne({ 'profile.email': email });
    if (!user) {
      return ApiResponseUtils.createResponse(
        ApiResponseUtils.resourceNotFoundErrorResponse(ErrorResponseMessages.NOT_FOUND_ERROR('User', 'email', email)),
        res,
      );
    }

    await this.cancellOldResetCodes(email);

    const passwordResetCode = new PasswordResetCodesModel({
      email: email,
      code: Math.random().toString(36).substr(2),
      valid_till: new Date(new Date().getTime() + 0.5 * 60 * 60 * 1000),
      status: 'active',
    });
    await passwordResetCode.save();
    return ApiResponseUtils.createResponse(
      ApiResponseUtils.apiOkResponse(201, false, null, 'Password reset code sent'),
      res,
    );
  }

  async resetPassword(req: Request, res: Response): Promise<Response> {
    const resetPasswordCred = matchedData(req);
    const passwordResetCode = await PasswordResetCodesModel.findOne({
      email: resetPasswordCred.email,
      code: resetPasswordCred.verification_code,
      status: 'active',
    });

    if (!passwordResetCode) {
      return ApiResponseUtils.createResponse(
        ApiResponseUtils.resourceNotFoundErrorResponse(
          ErrorResponseMessages.NOT_FOUND_ERROR(
            'Password reset code',
            'verification_code',
            resetPasswordCred.verification_code,
          ),
        ),
        res,
      );
    }
    const user = await User.findOne({ 'profile.email': resetPasswordCred.email });

    if (!user) {
      return ApiResponseUtils.createResponse(
        ApiResponseUtils.resourceNotFoundErrorResponse(
          ErrorResponseMessages.NOT_FOUND_ERROR('Customer', 'email', resetPasswordCred.email),
        ),
        res,
      );
    }

    //... TODO - MUST USE A DATABASE TRANSACTION FOR ALL BELOW DATA MUTATIONS
    user.password = await argon2.hash(resetPasswordCred.password);
    passwordResetCode.status = 'used';
    await passwordResetCode.save();
    await user.save();

    //... TODO - find all and mpdify ll of the login records
    const loginRecord: HydratedDocument<ILoginRecord> | null = await LoginRecord.findOne({
      user_id: user.id,
      status: 'active',
    }).exec();

    if (loginRecord) {
      loginRecord.status = 'cancelled';
      await loginRecord.save();
    }

    return ApiResponseUtils.createResponse(
      ApiResponseUtils.apiOkResponse(200, false, null, 'Password Changed Successfully'),
      res,
    );
  }
}

export default AccountRecoveryController;
