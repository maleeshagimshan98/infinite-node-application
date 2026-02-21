/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import cookieParser from 'cookie-parser';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import express from 'express';

import type { ILogger } from '@/application/interfaces/logger.interface';

import { coreMiddlewareConfig } from './middleware.config';

import type { RequestHandler } from 'express';
import type { AwilixContainer } from 'awilix';

export const coreMiddleware = async (container: AwilixContainer): Promise<Record<string, () => RequestHandler>> => {
  const middlewareConfigInstance = coreMiddlewareConfig(container);
  const middlewares = {
    cookieParser: (): RequestHandler => cookieParser(middlewareConfigInstance.cookieParser?.secret),
    session: (): RequestHandler =>
      session({
        secret: middlewareConfigInstance.session.secret,
        resave: middlewareConfigInstance.session.resave,
        saveUninitialized: middlewareConfigInstance.session.saveUninitialized,
        cookie: middlewareConfigInstance.session.cookie,
      }),
    cors: (): RequestHandler =>
      cors({
        origin: middlewareConfigInstance.cors.origin,
        credentials: middlewareConfigInstance.cors.credentials,
        exposedHeaders: middlewareConfigInstance.cors.exposedHeaders,
      }),
    helmet: (): RequestHandler => helmet(),
    rateLimit: (): RequestHandler =>
      rateLimit({
        windowMs: middlewareConfigInstance.rateLimit.windowMs!,
        max: middlewareConfigInstance.rateLimit.max!,
      }),
    morgan: (): RequestHandler => morgan(middlewareConfigInstance.morgan.format),
    json: (): RequestHandler => express.json({ limit: '10mb' }),
    urlencoded: (): RequestHandler => express.urlencoded({ extended: true, limit: '10mb' }),
    contentType: (): RequestHandler => (req, res, next) => {
      res.contentType('application/json');
      next();
    },
    logger: (): RequestHandler => {
      const logger = container.resolve<ILogger>('logger');
      return (req, res, next) => {
        logger.logInfo(`${req.method} ${req.originalUrl} - ${req.ip}`);
        next();
      };
    },
  };

  return middlewares;
};
