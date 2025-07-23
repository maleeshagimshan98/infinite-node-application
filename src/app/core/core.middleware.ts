/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';

export const coreMiddleware = (): Record<string, () => RequestHandler> => {
  const middlewares = {
    cookieParser: (): RequestHandler => cookieParser(),
    cors: (): RequestHandler => cors(),
    helmet: (): RequestHandler => helmet(),
    rateLimit: (): RequestHandler => rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }),
    contentType: (): RequestHandler => (req, res, next) => {
      res.contentType('application/json');
      next();
    },
  };

  return middlewares;
};
