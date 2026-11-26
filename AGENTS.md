# AGENTS.md — Titan V

Contexto de proyecto para sesiones de opencode. `README.md` es la fuente de
verdad funcional; este archivo resume reglas de trabajo y verificación.

## Proyecto

Titan V gestiona obras: proyectos, colaboradores con roles por proyecto,
materiales e inventario, tareas, turnos, evidencias, subcontratistas, kardex y
reportes. La constructora opera el sistema y el contratante consulta el avance.

## Stack

- Frontend: React 19 + TypeScript + Vite en `Frontend/`.
- Backend: Python 3 + FastAPI + SQLAlchemy en `backend/`.
- Base de datos: PostgreSQL; pruebas con SQLite.
- Autenticación: JWT (PyJWT) + Google OAuth 2.0 verificado server-side.
- Correo: SMTP para invitaciones y recuperación.
- Pruebas: pytest en backend. CI en `.github/workflows/ci.yml`.

## Reglas que no se deben romper

1. La identidad SIEMPRE sale del JWT (`get_current_user` en backend y
   `obtenerSesion()` en frontend). Nunca de `localStorage`, query params ni
   campos enviados por el cliente.
2. Todas las rutas de negocio están bajo `/api`. `VITE_API_URL` debe terminar
   en `/api` y las peticiones del frontend deben usar `fetchConToken()`.
3. El rol que manda es el de proyecto (`RolProyecto`): `Arquitecto`,
   `Trabajador`, `Visualizador`. `rolSistema` no habilita permisos de obra.
4. Materiales, movimientos e inventario pertenecen a un proyecto.
5. Borrado lógico con `fecha_eliminacion`; no borrado físico desde la app.
6. Evidencias: archivos bajo `TITANV_UPLOAD_DIR` o `backend/uploads`, subida y
   descarga autenticadas, máximo 15 MB.
7. Recuperación con token aleatorio hasheado y de un solo uso. Ninguna respuesta
   debe revelar si un correo está registrado.
8. Rate limit persistente en `intentos_acceso`; la IP se toma de
   `request.client.host`.
9. Un proyecto nunca debe quedar sin `Arquitecto`.

## Estado actual

Fecha: 2026-11-26. Rama activa: `main`. Funciones terminadas: CRUD de
proyectos, colaboradores, materiales, tareas, turnos, evidencias y
subcontratistas; kardex; reportes PDF/XLSX; invitaciones; JWT y Google OAuth;
cambio y recuperación de contraseña; permisos por rol de proyecto; aislamiento
por usuario; flujo de proyecto activo; migraciones Alembic; pruebas y CI.

## Verificación obligatoria

```bash
cd backend
python -m compileall -q app
python -m pytest -q
python -c "from app.main import app; app.openapi()"

cd ../Frontend
npm run lint
npm run build
```

## Convenciones

- Código, comentarios y mensajes de commit en español.
- Commits con prefijo convencional: `feat(...)`, `fix(...)`, `docs(...)`,
  `refactor(...)`.
- `pasos_para_opencode.txt` no debe recrearse.
- `Usuarios.tsx` quedó fuera del menú; no volver a engancharlo.
- No agregar comentarios nuevos al código salvo petición explícita.
- Los archivos `.env` no se suben al repositorio; `.env.example` debe estar
  sanitizado.
