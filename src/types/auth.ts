/**
 * Auth-related type definitions
 */

export interface CurrentUserResponseDTO {
  Email: string | null;
  Groups: string[];
  Username: string;
  UserId: string | null;
  IsAuthenticated: boolean;
}

export interface AuthError {
  error: string;
  error_description?: string;
  message?: string;
}