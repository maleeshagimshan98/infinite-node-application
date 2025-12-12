import type { Request, Response } from 'express';
import type { ILoginRecord } from '../../models/auth/login-record.model';
import { LoginRecord } from '../../models/auth/login-record.model';
import type { IUser } from '../../models/user/user.model';
import { User } from '../../models/user/user.model';
import { BaseController } from '../base.controller';
import APIResponseUtils from '../../app/utils/api-response/api-response-utils';
import type { HydratedDocument } from 'mongoose';
// import { APIResponseData } from '../../utils/api-response/api-response';
import argon2 from 'argon2';

class LoginController extends BaseController {
  constructor() {
    super();
  }

  async getLoginRecordFromAuthToken(token: string): Promise<HydratedDocument<ILoginRecord> | null> {
    return await LoginRecord.findOne({ token });
  }

  private async getUserFromAuthToken(userId: string): Promise<HydratedDocument<IUser> | null> {
    return await User.findById(userId);
  }

  /**
   * Validate the authentication token.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object to return user data.
   */
  async validate(req: Request, res: Response): Promise<Response> {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        const apiResponse = APIResponseUtils.noAuthorizationHeaderFoundResponse();
        return res.status(apiResponse.getCode()).send(apiResponse.toJson());
      }

      const loginRecord = await this.getLoginRecordFromAuthToken(token);

      if (!loginRecord) {
        const apiResponse = APIResponseUtils.invalidAuthorizationHeaderResponse();
        return res.status(apiResponse.getCode()).send(apiResponse.toJson());
      }

      if (loginRecord.status !== 'active') {
        const apiResponse = APIResponseUtils.expiredAuthorizationHeaderResponse();
        return APIResponseUtils.createResponse(apiResponse, res);
      }

      if (loginRecord.valid_till < new Date(new Date().getTime())) {
        loginRecord.status = 'expired';
        await loginRecord.save();
        const apiResponse = APIResponseUtils.expiredAuthorizationHeaderResponse();
        return APIResponseUtils.createResponse(apiResponse, res);
      }

      const user = await this.getUserFromAuthToken(loginRecord.user_id);

      if (!user) {
        const apiResponse = APIResponseUtils.invalidAuthorizationHeaderResponse();
        return res.status(apiResponse.getCode()).send(apiResponse.toJson());
      }

      return res.status(200).json({
        id: user._id.toString(),
        status: user.status,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * Generate a random token.
   *
   * @return {string} A random token string.
   */
  generateToken(): string {
    return Math.random().toString(36).substr(2);
  }

  /**
   * Login the user and create a login record.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object to return login result.
   * @throws {Error} Throws if there is a server error.
   */
  async login(req: Request, res: Response): Promise<Response> {
    try {
      const credentials = req.body;
      const user = await User.findOne({
        'profile.email': credentials.email,
      }).exec();

      if (!user) {
        const apiResponse = APIResponseUtils.apiErrorResponse(401, 'invalid credentials');
        return APIResponseUtils.createResponse(apiResponse, res);
      }

      const isPasswordMatching = await argon2.verify(user.password, credentials.password);
      if (!isPasswordMatching) {
        return APIResponseUtils.createResponse(APIResponseUtils.apiErrorResponse(401, 'invalid credentials'), res);
      }

      const token = this.generateToken(); // Implement token generation logic

      const loginRecord = new LoginRecord({
        user_id: user._id,
        token,
        valid_till: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // 1 day
        status: 'active',
      });

      await loginRecord.save();

      res.setHeader('Authorization', `Bearer ${token}`);
      const apiResponse = APIResponseUtils.apiOkResponse(201, false, null, 'Logged in successfully', {
        id: user._id.toString(),
        status: user.status,
        token, // remove this and fix the token issue in front end
      });
      return APIResponseUtils.createResponse(apiResponse, res);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  /**
   * Logout a user
   *
   * @param {Request} req Request
   * @param {Response} res Response
   * @returns {Response}
   */
  async logout(req: Request, res: Response): Promise<Response> {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      const apiResponse = APIResponseUtils.noAuthorizationHeaderFoundResponse();
      return res.status(apiResponse.getCode()).send(apiResponse.toJson());
    }

    const loginRecord = await this.getLoginRecordFromAuthToken(token);

    if (!loginRecord) {
      const apiResponse = APIResponseUtils.invalidAuthorizationHeaderResponse();
      return res.status(apiResponse.getCode()).send(apiResponse.toJson());
    }

    loginRecord.status = 'cancelled';
    await loginRecord.save();
    return APIResponseUtils.createResponse(APIResponseUtils.apiOkResponse(200, false, null, 'User logged out'), res);
  }
}

export default LoginController;
