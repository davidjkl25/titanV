-- ============================================================================
--  Titan V - Migracion de esquema para la rama `test`
--  Alinea la base de datos `titanv_db` con los modelos de
--  backend/app/models/ (que son la fuente de verdad del backend).
--
--  - materiales.proyecto_id      : los materiales pertenecen a un proyecto
--  - evidencias_multimedia.tarea_id : la evidencia cuelga de una tarea
--  - backfill de datos existentes (sin perder filas)
-- ============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. materiales.proyecto_id
-- ---------------------------------------------------------------------------
ALTER TABLE materiales ADD COLUMN IF NOT EXISTS proyecto_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_material_proyecto') THEN
        ALTER TABLE materiales ADD CONSTRAINT fk_material_proyecto
            FOREIGN KEY (proyecto_id) REFERENCES proyectos_obra(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Los materiales que quedaron sin proyecto se asignan al primer proyecto
-- existente, para que no queden huerfanos en el modulo de inventario.
UPDATE materiales
SET proyecto_id = (SELECT MIN(id) FROM proyectos_obra)
WHERE proyecto_id IS NULL
  AND EXISTS (SELECT 1 FROM proyectos_obra);

-- ---------------------------------------------------------------------------
-- 2. evidencias_multimedia.tarea_id (reemplaza proyecto_id)
-- ---------------------------------------------------------------------------
ALTER TABLE evidencias_multimedia ADD COLUMN IF NOT EXISTS tarea_id INTEGER;

-- Cada evidencia se asocia a una tarea de su mismo proyecto.
UPDATE evidencias_multimedia AS evidencia
SET tarea_id = (
    SELECT tarea.id FROM tareas AS tarea
    WHERE tarea.proyecto_id = evidencia.proyecto_id
    ORDER BY tarea.id
    LIMIT 1
)
WHERE evidencia.tarea_id IS NULL
  AND EXISTS (SELECT 1 FROM tareas AS tarea WHERE tarea.proyecto_id = evidencia.proyecto_id);

-- Si alguna evidencia se queda sin tarea (proyecto sin tareas), se le asigna
-- la primera tarea disponible para no dejar la columna en NULL.
UPDATE evidencias_multimedia
SET tarea_id = (SELECT MIN(id) FROM tareas)
WHERE tarea_id IS NULL
  AND EXISTS (SELECT 1 FROM tareas);

ALTER TABLE evidencias_multimedia ALTER COLUMN tarea_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_evidencia_tarea') THEN
        ALTER TABLE evidencias_multimedia ADD CONSTRAINT fk_evidencia_tarea
            FOREIGN KEY (tarea_id) REFERENCES tareas(id) ON DELETE CASCADE;
    END IF;
END $$;

-- El proyecto se deduce de la tarea: la columna deja de ser necesaria.
ALTER TABLE evidencias_multimedia DROP COLUMN IF EXISTS proyecto_id;

COMMIT;
