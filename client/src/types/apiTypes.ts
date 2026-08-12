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


export interface RegisterMultipartPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  accountType: 'personal' | 'business';
  birthDate?: string;
  companyName?: string;
  inn?: string;
  avatar: File;
  companyDocument?: File;
};

export type RegisterMultipartResponse =
  | { userId: string }
  | { error: string; field: string };


export type AuthChannelMessage =
    | { type: 'logout' }
    | { type: 'refreshed'; expiresIn: number }
    | { type: 'login'; expiresIn: number };
