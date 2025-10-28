/**
 * Auth-related type definitions
 */

export interface CurrentUserResponseDTO {
  Email: string | null;
  Groups?: string[];
  // Add other user properties as needed
}

export interface OAuth2TokenResponseDTO {
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
}

export interface TokenResponse {
  AccessToken: string;
  RefreshToken: string;
  IdToken: string;
  ExpiresIn: number;
}

export interface AuthError {
  error: string;
  error_description?: string;
  message?: string;
}