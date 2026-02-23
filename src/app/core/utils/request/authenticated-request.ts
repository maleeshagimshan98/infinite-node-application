import type { User } from '@/domain/user/models/user';

import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: User;
}
