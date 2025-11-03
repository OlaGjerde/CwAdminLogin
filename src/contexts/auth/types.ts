import type { CurrentUserResponseDTO } from '../../types/auth';

// Type alias for backward compatibility
type UserInfo = CurrentUserResponseDTO;

export interface AuthContextValue {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  userEmail: string | null;
  userInfo: UserInfo | null;
  error: string | null;
  
  // Actions
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}