import React from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from './context';
import { useCognitoAuth } from '../../hooks/useCognitoAuth';

export interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useCognitoAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};