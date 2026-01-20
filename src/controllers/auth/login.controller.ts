import type { Request, Response } from 'express';
import { BaseController } from '../base.controller';
import APIResponseUtils from '../../app/utils/api-response/api-response-utils';
import { LoginService } from '../../services/auth/login.service';
import { matchedData } from 'express-validator';

class LoginController extends BaseController {
  private loginService: LoginService;

  constructor() {
    super();
    this.loginService = new LoginService();
  }

  /**
   * Validate the authentication token.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object to return user data.
   * @returns {Promise<Response>}
   */
  async validate(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const token = req.headers.authorization?.split(' ')[1];
      const result = await this.loginService.validateToken(token || '');

      return APIResponseUtils.apiOkResponse(200, false, null, 'Token is valid', result);
    });

    return APIResponseUtils.createResponse(response, res);
  }

  /**
   * Login the user and create a login record.
   *
   * @param {Request} req - The incoming request object.
   * @param {Response} res - The response object to return login result.
   * @returns {Promise<Response>}
   */
  async login(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const credentials = matchedData(req);
      const result = await this.loginService.login(credentials.email, credentials.password);

      res.setHeader('Authorization', `Bearer ${result.token}`);

      return APIResponseUtils.apiOkResponse(201, false, null, 'Logged in successfully', {
        id: result.id,
        status: result.status,
        token: result.token, // remove this and fix the token issue in front end
      });
    });

    return APIResponseUtils.createResponse(response, res);
  }

  /**
   * Logout a user
   *
   * @param {Request} req - Request
   * @param {Response} res - Response
   * @returns {Promise<Response>}
   */
  async logout(req: Request, res: Response): Promise<Response> {
    const response = await this.catchExceptionsWrapper(async () => {
      const token = req.headers.authorization?.split(' ')[1];
      await this.loginService.logout(token || '');

      return APIResponseUtils.apiOkResponse(200, false, null, 'User logged out successfully', null);
    });

    return APIResponseUtils.createResponse(response, res);
  }
}

export default LoginController;
