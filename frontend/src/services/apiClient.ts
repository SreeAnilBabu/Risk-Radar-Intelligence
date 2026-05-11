type ApiEnvelope<T> = {
  data: T;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3010";

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const fallbackMessage = `Request failed with status ${response.status}`;
    let errorMessage = fallbackMessage;

    try {
      const payload = await response.json() as { error?: { message?: string } };
      errorMessage = payload.error?.message ?? fallbackMessage;
    } catch {
      errorMessage = fallbackMessage;
    }

    throw new Error(errorMessage);
  }

  const payload = await response.json() as ApiEnvelope<T> & Record<string, unknown>;
  if (!("data" in payload)) {
    return payload as T;
  }

  return payload.data;
}

export async function apiRequestWithMeta<T, M extends Record<string, unknown>>(path: string, init?: RequestInit): Promise<ApiEnvelope<T> & M> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return await response.json() as ApiEnvelope<T> & M;
}
