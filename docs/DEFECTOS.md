# Registro de defectos

Fecha de cierre: 2026-11-26. Rama: `main`.

| ID | Defecto | Corrección | Evidencia |
|---|---|---|---|
| H-01 | Dos implementaciones de JWT con expiraciones distintas | JWT unificado en `core/security.py`, con claims obligatorios y vigencia configurable | `tests/test_seguridad.py` |
| H-02 | Evidencias sin autenticación y límite de tamaño no aplicado | Routers autenticados, descarga por endpoint propio, validación de extensión y límite de 15 MB por chunks | `tests/test_auth_router.py`, `docs/ACEPTACION.md` |
| H-03 | PIN de 4 dígitos en texto plano y reutilizable; mensajes filtraban correos | Token aleatorio hasheado, un solo uso, sesión temporal y respuesta genérica | `tests/test_auth_router.py` |
| H-04 | Rate limit en memoria y basado en encabezado falsificable | Persistencia en `intentos_acceso` e IP desde `request.client.host` | `tests/test_proteccion.py` |
| H-05 | Permisos del frontend siempre verdaderos | `DashboardPage` y `Sidebar` derivan permisos del rol de proyecto | `npm run build`, revisión de `MODULOS_POR_ROL` |
| H-06 | Usuario tomado de `localStorage` o query params | `auth.ts` decodifica el JWT; se eliminaron `usuario_id` y `rolSistema` de decisiones de permiso | revisión de componentes |
| H-07 | Login de invitación y recuperación apuntaban a URLs incorrectas | Rutas construidas desde `API_URL`, que siempre termina en `/api` | `src/api.ts`, `AceptarInvitacionPage.tsx` |
| H-08 | Trigger de stock y esquema no coincidentes | Migración Alembic y `sql/database.sql` actualizados | `alembic upgrade head` sobre SQLite |
| H-09 | Servicio de tareas creaba proyecto o usuario por defecto | Validación estricta y `TareaCreate` sin IDs por defecto | `tests/test_tarea_service.py` |
| H-10 | Cambiar contraseña desde el perfil no persistía | Endpoint `POST /api/usuarios/me/contrasena` guarda el hash nuevo | `tests/test_auth_router.py` |
| H-11 | Router de subcontratistas no registrado y modelos inexistentes | Modelo, esquema, servicio y router añadidos y registrados en `main.py` | `app.openapi()` |
| H-12 | Sin pruebas, CI ni migraciones versionadas | 12 pruebas pytest, workflow de CI y revisión Alembic | `python -m pytest -q`, `.github/workflows/ci.yml` |
| H-13 | Documentación desactualizada | READMEs y `AGENTS.md` actualizados a `main`, `/api` y estado actual | este repositorio |
| H-14 | DDL en arranque, `.env.example` inseguro y logs versionados | Arranque sin `create_all`/`ALTER`, ejemplo sanitizado y logs eliminados del índice | `git status`, `app/main.py` |
| H-15 | Mensajes y URLs con `localhost:8000` en el frontend | URLs centralizadas en `api.ts`; mensajes sin direcciones fijas | `npm run lint`, `npm run build` |
| H-16 | Sin criterios de aceptación ni registro de defectos | Documentos `docs/ACEPTACION.md` y `docs/DEFECTOS.md` | este archivo |

## Observaciones

- La migración de Alembic se verificó con SQLite. En PostgreSQL debe ejecutarse
  `alembic upgrade head` antes de arrancar la API.
- Los valores reales de `.env` no forman parte del repositorio.
- `Usuarios.tsx` permanece fuera del menú, conforme a la convención existente.
