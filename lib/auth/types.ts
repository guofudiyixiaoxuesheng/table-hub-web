export type AppRole = "admin" | "manager" | "dm" | "user" | "guest";

export type AuthUser = {
  id: string;
  phone: string;
  nickname: string | null;
  avatarUrl: string | null;
  storeId: string | null;
  storeName: string | null;
  role: AppRole;
  hasPassword: boolean;
};

export type AuthSession = {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: AuthUser;
};

export type ApiEnvelope<T> = {
  code: string;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
};
