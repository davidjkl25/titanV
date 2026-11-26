import { jwtDecode } from 'jwt-decode';

export interface Sesion {
  usuarioId: number;
  rolSistema: number;
  nombre: string;
  correo: string;
}

interface ClaimsToken {
  sub?: string;
  rol?: number | string;
  nombre?: string;
  correo?: string;
  exp?: number;
}

const CLAVE_TOKEN = 'token';

export const obtenerToken = (): string | null => localStorage.getItem(CLAVE_TOKEN);

export const haySesion = (): boolean => {
  const token = obtenerToken();
  if (!token) return false;
  try {
    const claims = jwtDecode<ClaimsToken>(token);
    return !claims.exp || claims.exp * 1000 > Date.now();
  } catch {
    cerrarSesion();
    return false;
  }
};

export const obtenerSesion = (): Sesion | null => {
  const token = obtenerToken();
  if (!token) return null;
  try {
    const claims = jwtDecode<ClaimsToken>(token);
    if (claims.exp && claims.exp * 1000 <= Date.now()) {
      cerrarSesion();
      return null;
    }
    const usuarioId = Number(claims.sub);
    if (!Number.isInteger(usuarioId)) return null;
    return {
      usuarioId,
      rolSistema: Number(claims.rol ?? 3),
      nombre: claims.nombre || 'Usuario',
      correo: claims.correo || '',
    };
  } catch {
    cerrarSesion();
    return null;
  }
};

export const guardarSesion = (respuesta: {
  token?: string;
  access_token?: string;
}): void => {
  const token = respuesta.token || respuesta.access_token;
  if (!token) throw new Error('La respuesta de autenticación no incluyó un token.');
  localStorage.setItem(CLAVE_TOKEN, token);
  window.dispatchEvent(new StorageEvent('storage', { key: 'titanv_auth_sync' }));
};

export const cerrarSesion = (): void => {
  localStorage.removeItem(CLAVE_TOKEN);
  localStorage.removeItem('usuario_id');
  localStorage.removeItem('usuario_nombre');
  localStorage.removeItem('usuario_correo');
  localStorage.removeItem('rol');
  window.dispatchEvent(new StorageEvent('storage', { key: 'titanv_auth_sync' }));
};

export const headersConToken = (): Record<string, string> => {
  const token = obtenerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
