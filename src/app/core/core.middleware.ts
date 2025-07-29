/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';
import morgan from 'morgan';
import express from 'express';

export const coreMiddleware = (): Record<string, () => RequestHandler> => {
  const middlewares = {
    cookieParser: (): RequestHandler => cookieParser(),
    cors: (): RequestHandler => cors(),
    helmet: (): RequestHandler => helmet(),
    rateLimit: (): RequestHandler =>
      rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '15', 10) * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
      }),
    morgan: (): RequestHandler => morgan('dev'),
    json: (): RequestHandler => express.json({ limit: '10mb' }),
    urlencoded: (): RequestHandler => express.urlencoded({ extended: true, limit: '10mb' }),
    contentType: (): RequestHandler => (req, res, next) => {
      res.contentType('application/json');
      next();
    },
  };

  return middlewares;
};
