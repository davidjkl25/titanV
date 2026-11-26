const normalizarUrlApi = (valor: string): string => {
  const base = valor.replace(/\/+$/, '');
  return base.endsWith('/api') ? base : `${base}/api`;
};

export const API_URL = normalizarUrlApi(
  (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:8000/api'
);

const construirUrl = (endpoint: string): string => `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

const esFormData = (body: BodyInit | null | undefined): boolean =>
  typeof FormData !== 'undefined' && body instanceof FormData;

export const fetchConToken = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    ...(!esFormData(options.body) ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(construirUrl(endpoint), { ...options, headers });

  if (response.status === 401) {
    localStorage.removeItem('token');
    window.dispatchEvent(new StorageEvent('storage', { key: 'titanv_auth_sync' }));
  }

  return response;
};
