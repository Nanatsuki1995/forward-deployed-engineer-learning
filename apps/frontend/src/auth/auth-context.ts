import { createContext } from 'react';
import type { User } from '../api/client';

export type AuthStatus = 'checking' | 'anonymous' | 'authenticated';

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthContextValue {
  error: string | null;
  login: (input: LoginInput) => Promise<User>;
  logout: () => Promise<void>;
  status: AuthStatus;
  user: User | null;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
