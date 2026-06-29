export type GetIdToken = () => Promise<string | null>;

export async function authHeaders(getIdToken: GetIdToken): Promise<HeadersInit> {
  const token = await getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchWithAuth(
  input: RequestInfo | URL,
  getIdToken: GetIdToken,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = await getIdToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, { ...init, headers });
}
