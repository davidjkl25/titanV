# Frontend Titan V

Cliente web de Titan V con React 19, TypeScript y Vite.

## Arranque

```bash
npm ci
cp .env.example .env            # Windows: copy .env.example .env
npm run dev
```

Variables:

- `VITE_API_URL`: base de la API, debe terminar en `/api`. Por defecto
  `http://127.0.0.1:8000/api`.
- `VITE_GOOGLE_CLIENT_ID`: client ID de Google OAuth 2.0.

## Estructura

```text
src/
├── api.ts      # API_URL y fetchConToken
├── auth.ts     # sesión leída del JWT
├── pages/      # Landing, Login, Dashboard, AceptarInvitacion, Recuperar
└── components/ # Sidebar y módulos operativos
```

## Reglas

- La identidad del usuario se obtiene de `obtenerSesion()`, que decodifica el
  JWT. `localStorage` solo almacena el token y preferencias no sensibles.
- Las peticiones a la API pasan por `fetchConToken()`, que adjunta el JWT y
  cierra la sesión en un 401.
- Los permisos de módulos y acciones dependen del rol dentro del proyecto
  activo: `Arquitecto`, `Trabajador` o `Visualizador`.
- No se deben hardcodear URLs de API en componentes; usar `API_URL` o
  `fetchConToken()`.

## Verificación

```bash
npm run lint
npm run build
```
