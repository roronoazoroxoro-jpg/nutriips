"use client";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** fetch JSON con manejo uniforme de errores; si la sesión venció, vuelve al login. */
export async function api<T = unknown>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: json !== undefined ? { "Content-Type": "application/json", ...headers } : headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiError("No hay conexión con el servidor", 0);
  }
  if (response.status === 401 && typeof window !== "undefined" && window.location.pathname !== "/") {
    window.location.href = "/?vencida=1";
    throw new ApiError("Tu sesión terminó", 401);
  }
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new ApiError(data.error ?? "No se pudo completar la acción", response.status);
  return data as T;
}
