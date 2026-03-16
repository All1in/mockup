export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}
  
export interface AuthResponse {
  user: AuthUser;
  accessExpiresIn?: number;
}

export interface ApiErrorPayload {
  error?: string;
  message?: string;
  code?: string;
}
