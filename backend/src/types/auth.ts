import type { Request } from "express";

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};