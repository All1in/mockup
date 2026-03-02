export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export type AuthorizedUser = {
  user: User;
  expiresIn: number;
};

export type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (payload: Login) => Promise<void>;
  logout: () => Promise<void>;
  register: (payload: Register) => Promise<void>;
};

export type Login = {
  email: string;
  password: string;
};

export type Register = {
  name: string;
  email: string;
  password: string;
};
