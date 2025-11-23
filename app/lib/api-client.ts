const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type FetchOptions = RequestInit & { skipAuthHeader?: boolean };

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
  accessToken?: string | null
): Promise<T> {
  const { skipAuthHeader, ...rest } = options;
  const isFormData = options.body instanceof FormData;
  const resp = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
      ...(accessToken && !skipAuthHeader
        ? { Authorization: `Bearer ${accessToken}` }
        : {}),
    },
    ...rest,
  });
  if (!resp.ok) {
    const message = await safeErrorMessage(resp);
    throw new Error(message);
  }
  return resp.json() as Promise<T>;
}

export async function apiFetchBlob(
  path: string,
  options: FetchOptions = {},
  accessToken?: string | null
): Promise<Blob> {
  const { skipAuthHeader, ...rest } = options;
  const isFormData = options.body instanceof FormData;
  const resp = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
      ...(accessToken && !skipAuthHeader
        ? { Authorization: `Bearer ${accessToken}` }
        : {}),
    },
    ...rest,
  });
  if (!resp.ok) {
    const message = await safeErrorMessage(resp);
    throw new Error(message);
  }
  return resp.blob();
}

async function safeErrorMessage(resp: Response) {
  try {
    const data = await resp.json();
    if (typeof data.detail === "string") {
      return data.detail;
    }
  } catch {
    // ignore
  }
  return "リクエストに失敗しました";
}
