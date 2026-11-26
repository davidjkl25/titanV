# Titan V — Sistema de Gestión de Obra

Titan V centraliza la operación de proyectos de infraestructura para PyMEs de
construcción: proyectos, colaboradores con roles por obra, materiales e
inventario, tareas, turnos, evidencias, subcontratistas, kardex y reportes.
El cliente contratante consulta el avance; la constructora opera el sistema.

Estado actual: 2026-11-26, rama `main`.

## Funcionalidades

- CRUD de proyectos, colaboradores, materiales, solicitudes, tareas, turnos,
  subcontratistas y evidencias.
- Roles por proyecto: `Arquitecto`, `Trabajador` y `Visualizador`.
- Aislamiento de datos: el usuario siempre se obtiene del JWT, nunca de
  `localStorage` ni de parámetros de consulta.
- Inventario por obra con kardex y validación de stock.
- Evidencias por tarea con subida autenticada, descarga autenticada, tamaño
  máximo de 15 MB y lista blanca de extensiones.
- JWT único con expiración configurable (`JWT_EXPIRE_MINUTES`, 60 minutos por
  defecto) y contraseñas con bcrypt.
- Google OAuth 2.0 con verificación server-side del `credential`.
- Recuperación de contraseña con token aleatorio de un solo uso, hasheado en
  base de datos y mensajes genéricos.
- Limitador de intentos persistente en PostgreSQL/SQLite, sin confiar en
  encabezados `X-Forwarded-For`.
- Invitaciones por correo con enlaces expirables; si SMTP no está disponible,
  el enlace se devuelve al Arquitecto.
- Reportes PDF y XLSX por proyecto.
- Migraciones versionadas con Alembic.
- Pruebas automatizadas de backend y CI para backend y frontend.

## Stack

- Frontend: React 19 + TypeScript + Vite.
- Backend: Python 3 + FastAPI + SQLAlchemy + Pydantic.
- Base de datos: PostgreSQL. Las pruebas usan SQLite.
- Autenticación: PyJWT + bcrypt + Google OAuth 2.0.
- Configuración: `python-dotenv`.

## Estructura

```text
titanV/
├── Frontend/
│   ├── src/
│   │   ├── api.ts            # API_URL y fetchConToken
│   │   ├── auth.ts           # sesión derivada del JWT
│   │   ├── pages/
│   │   └── components/
│   ├── .env.example          # VITE_GOOGLE_CLIENT_ID, VITE_API_URL
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── core/             # config, database, security, deps, permissions
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routers/
│   │   └── services/
│   ├── migrations/           # revisiones de Alembic
│   ├── tests/                # pytest
│   ├── sql/database.sql      # esquema y trigger de stock
│   ├── .env.example
│   └── requirements*.txt
├── docs/
│   ├── ACEPTACION.md
│   └── DEFECTOS.md
└── .github/workflows/ci.yml
```

## Permisos

| Rol | Puede | No puede |
|---|---|---|
| Arquitecto | Control total del proyecto, invitar y cambiar roles, borrar registros ajenos | — |
| Trabajador | Crear/editar tareas, turnos, evidencias, movimientos y comentarios propios | Administrar colaboradores ni eliminar registros ajenos |
| Visualizador | Leer tareas, turnos, evidencias, inventario y reportes | Crear, editar o eliminar registros |

Los módulos operativos solo se desbloquean al entrar a un proyecto. La barra
lateral muestra el proyecto activo y permite cambiarlo.

## API

Todas las rutas de negocio están bajo `/api`. La documentación interactiva está
en `http://localhost:8000/docs`.

### Autenticación y usuarios

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/registro` | Registro público |
| POST | `/api/auth/login` | Login con correo y contraseña |
| POST | `/api/auth/google` | Login con Google OAuth 2.0 |
| GET | `/api/auth/verificar` | Verificar token |
| POST | `/api/auth/forgot-password` | Solicitar token de recuperación |
| POST | `/api/auth/verify-pin` | Verificar token de recuperación |
| POST | `/api/auth/reset-password` | Guardar nueva contraseña |
| GET/POST | `/api/usuarios/` | Listar o crear usuarios |
| GET/PUT/DELETE | `/api/usuarios/{usuario_id}` | Detalle, edición o borrado lógico |
| POST | `/api/usuarios/me/contrasena` | Cambiar contraseña del perfil |
| POST | `/api/usuarios/{usuario_id}/restaurar` | Restaurar usuario |

### Proyectos, colaboradores e invitaciones

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST | `/api/proyectos/` | Listar o crear proyectos |
| GET/PUT/DELETE | `/api/proyectos/{proyecto_id}` | Detalle, edición o borrado lógico |
| POST | `/api/proyectos/{proyecto_id}/restaurar` | Restaurar proyecto |
| GET/POST/PUT/DELETE | `/api/proyectos/{proyecto_id}/colaboradores/` | Gestión de colaboradores |
| GET/POST/DELETE | `/api/proyectos/{proyecto_id}/enlaces` | Enlaces de invitación |
| POST | `/api/invitaciones/{token}/aceptar` | Aceptar invitación |

### Operación

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/materiales/` | Insumos por proyecto |
| POST | `/api/movimientos/` | Entrada o salida de inventario |
| GET | `/api/movimientos/inventario/{proyecto_id}` | Stock actual |
| GET/POST/PUT/DELETE | `/api/solicitudes/` | Solicitudes de material |
| GET/POST/PUT/DELETE | `/api/tareas/` | Tareas |
| GET/POST/DELETE | `/api/tareas/{tarea_id}/comentarios` | Comentarios por tarea |
| GET/POST/DELETE | `/api/tareas/{tarea_id}/evidencias/` | Evidencias por tarea |
| GET | `/api/tareas/{tarea_id}/evidencias/{evidencia_id}/descargar` | Descarga autenticada |
| GET/POST/PUT/DELETE | `/api/turnos/` | Turnos y asistencia |
| GET/POST/PUT/DELETE | `/api/subcontratistas/` | Subcontratistas |
| GET | `/api/proyectos/{proyecto_id}/reportes/exportar` | Reporte PDF o XLSX |

## Instalación

Requisitos: Python 3.10+, Node.js 20+, PostgreSQL 14+.

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env            # Windows: copy .env.example .env
```

Configura `DATABASE_URL`, `JWT_SECRET_KEY`, `GOOGLE_CLIENT_ID` y, si aplica,
los valores SMTP en `backend/.env`. No subir `.env` al repositorio.

```bash
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd Frontend
npm ci
cp .env.example .env            # Windows: copy .env.example .env
npm run dev
```

`VITE_API_URL` debe terminar en `/api`; por defecto es
`http://127.0.0.1:8000/api`.

## Verificación

```bash
cd backend
python -m compileall -q app
python -m pytest -q

cd ../Frontend
npm run lint
npm run build
```

También hay CI en `.github/workflows/ci.yml` para `main` y pull requests.
Los criterios de aceptación y el registro de defectos están en `docs/`.
