# Criterios de aceptación

Fecha: 2026-11-26. Rama: `main`.

## Autenticación y seguridad

- Existe una sola implementación de JWT en `backend/app/core/security.py` con
  HS256, `sub`, `iat` y `exp` obligatorios y vigencia configurada con
  `JWT_EXPIRE_MINUTES`.
- La contraseña se hashea con bcrypt. El cambio de contraseña del perfil
  persiste el valor nuevo.
- La recuperación usa un token aleatorio de 32 bytes, se guarda hasheado y se
  invalida tras un solo uso. Las respuestas de `forgot-password` son
  indistinguibles para correos registrados y no registrados.
- El limitador de intentos persiste en `intentos_acceso` y toma la IP de
  `request.client.host`.
- Las evidencias requieren JWT para subirse, listarse y descargarse. El tamaño
  máximo es 15 MB y la descarga usa
  `GET /api/tareas/{tarea_id}/evidencias/{evidencia_id}/descargar`.

## Identidad y permisos

- El frontend obtiene `usuarioId` y permisos desde el JWT mediante
  `obtenerSesion()`.
- Los permisos de obra dependen de `RolProyecto`, nunca de `rolSistema`.
- El Visualizador no ve acciones de escritura y las rutas backend rechazan sus
  escrituras.
- Un proyecto no puede quedar sin `Arquitecto`.

## Datos y módulos

- `crear_tarea` rechaza proyectos o usuarios inexistentes y no crea registros
  por defecto.
- Los subcontratistas están registrados en la API y protegidos por rol de
  proyecto.
- `alembic upgrade head` crea o actualiza el esquema, incluida la tabla
  `intentos_acceso`, los campos de recuperación y el trigger de stock.
- `backend/sql/database.sql` coincide con los modelos actuales.

## Proceso y documentación

- Hay pruebas backend con pytest y CI para backend y frontend en
  `.github/workflows/ci.yml`.
- README, README del backend, README del frontend y `AGENTS.md` reflejan la
  rama `main`, la fecha actual y el prefijo `/api`.
- Existen `docs/ACEPTACION.md` y `docs/DEFECTOS.md`.
- Los logs de uvicorn no están versionados.

## Comandos de verificación

```bash
cd backend
python -m compileall -q app
python -m pytest -q
python -c "from app.main import app; app.openapi()"

cd ../Frontend
npm run lint
npm run build
```

Resultado esperado: 12 pruebas backend aprobadas, importación y `openapi()`
correctos, lint sin errores y build de producción correcto.
