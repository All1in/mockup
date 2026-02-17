import { User } from '../db/entities';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
