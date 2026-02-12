/**
 * Copyright - 2025 - Maleesha Gimshan (www.github.com/maleeshagimshan98)
 */

import RedisStore from 'rate-limit-redis';

import type { AwilixContainer } from 'awilix';
import type { Options } from 'express-rate-limit';
import type { RedisReply } from 'rate-limit-redis';
import type { Request, Response } from 'express';
import type { SessionOptions } from 'express-session';
import type { CorsOptions } from 'cors';

export interface MiddlewareConfig {
  cookieParser: {
    secret: string;
    options?: {
      secure: boolean;
    };
  };
  session: SessionOptions;
  bodyParser: {
    json: {
      strict: boolean;
      inflate: boolean;
      limit: string;
    };
    urlencoded: {
      extended: boolean;
      limit: string;
    };
  };
  cors: CorsOptions;
  helmet: {
    contentSecurityPolicy: boolean;
  };
  rateLimit: Partial<Options>;
  morgan: {
    format: string;
  };
}

export const coreMiddlewareConfig: (container: AwilixContainer) => MiddlewareConfig = (container: AwilixContainer) => {
  return {
    cookieParser: {
      secret: process.env.COOKIE_SECRET || 'your_cookie_secret',
      options: {
        secure: process.env.NODE_ENV === 'production',
      },
    },
    session: {
      secret: process.env.SESSION_SECRET || 'your_session_secret',
      resave: process.env.SESSION_RESAVE === 'true',
      saveUninitialized: process.env.SESSION_SAVE_UNINITIALIZED === 'true',
      cookie: {
        domain: process.env.COOKIE_DOMAIN || 'localhost',
        path: process.env.COOKIE_PATH || '/',
        priority: (process.env.COOKIE_PRIORITY as 'low' | 'medium' | 'high') ?? 'low',
        secure: process.env.COOKIE_SECURE === 'true',
        expires: new Date(Date.now() + 3600000), // 1 hour
        httpOnly: process.env.COOKIE_HTTP_ONLY === 'true',
        maxAge: parseInt(process.env.COOKIE_MAX_AGE ?? '3600000', 10),
        partitioned: process.env.COOKIE_PARTITIONED === 'true',
      },
    },
    bodyParser: {
      json: {
        strict: process.env.BODY_PARSER_JSON_STRICT === 'true',
        inflate: process.env.BODY_PARSER_JSON_INFLATE === 'true',
        limit: process.env.BODY_PARSER_JSON_LIMIT || '1mb',
      },
      urlencoded: {
        extended: true,
        limit: process.env.BODY_PARSER_URLENCODED_LIMIT || '1mb',
      },
    },
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,OPTIONS',
      allowedHeaders: process.env.CORS_ALLOWED_HEADERS || '',
      exposedHeaders: process.env.CORS_EXPOSED_HEADERS || '',
      credentials: process.env.CORS_CREDENTIALS === 'true',
      maxAge: parseInt(process.env.CORS_MAX_AGE ?? '86400', 10),
    },
    helmet: {
      contentSecurityPolicy: process.env.HELMET_CSP_ENABLED === 'true',
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '15 * 60 * 1000', 10), // Default to 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10), // Default to 100 requests
      legacyHeaders: process.env.RATE_LIMIT_LEGACY_HEADERS === 'true',
      message: process.env.RATE_LIMIT_MESSAGE || 'Too many requests',
      statusCode: parseInt(process.env.RATE_LIMIT_STATUS_CODE ?? '429', 10),
      handler: (req: Request, res: Response): void => {
        res.status(429).send({
          error: 'Too many requests',
          message: 'You have exceeded the rate limit',
        });
      },
      passOnStoreError: process.env.PASS_ON_STORE_ERROR === 'true',
      store: new RedisStore({
        sendCommand: async (...args: string[]): Promise<RedisReply> => {
          const client = container.resolve('cache');
          return await client.sendCommand(args);
        },
      }),
    },
    morgan: {
      format: process.env.MORGAN_FORMAT || 'dev',
    },
  };
};
