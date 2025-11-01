import type { Request } from 'express';
import type { HydratedDocument } from 'mongoose';

export interface AuthenticatedRequest<T> extends Request {
  user?: HydratedDocument<T>;
}
