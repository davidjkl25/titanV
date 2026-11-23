const API_URL = (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000";

export const fetchConToken = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = localStorage.getItem("token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    alert("Tu sesión expiró o no es válida. Por favor, inicia sesión nuevamente.");
    window.location.href = "/login";
  }

  if (response.status === 403) {
    console.warn("Acceso denegado (403):", endpoint);
  }

  return response;
};
