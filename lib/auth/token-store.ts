let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(value: string | null): void {
  accessToken = value;
}
