from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.engine import Inspector

from app.core.database import Base
from app import models  # noqa: F401

revision: str = "9c7b2e1f4a80"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _inspector() -> Inspector:
    return sa.inspect(op.get_bind())


def _columnas_existentes(inspector: Inspector, tabla: str) -> set[str]:
    return {columna["name"] for columna in inspector.get_columns(tabla)}


def _agregar_columna_si_falta(inspector: Inspector, tabla: str, columna: str, tipo) -> None:
    if columna not in _columnas_existentes(inspector, tabla):
        op.add_column(tabla, sa.Column(columna, tipo, nullable=True))


def _crear_indice_si_falta(inspector: Inspector, tabla: str, nombre: str, columnas: Sequence[str]) -> None:
    indices = {indice["name"] for indice in inspector.get_indexes(tabla)}
    if nombre not in indices:
        op.create_index(nombre, tabla, list(columnas), unique=False)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = _inspector()
    Base.metadata.create_all(bind=bind)

    inspector = _inspector()
    if "usuarios" in inspector.get_table_names():
        columnas = _columnas_existentes(inspector, "usuarios")
        _agregar_columna_si_falta(inspector, "usuarios", "reset_token_hash", sa.String(64))
        _agregar_columna_si_falta(inspector, "usuarios", "reset_token_expira", sa.DateTime())
        _agregar_columna_si_falta(inspector, "usuarios", "reset_token_usado_en", sa.DateTime())
        _agregar_columna_si_falta(inspector, "usuarios", "reset_sesion_hash", sa.String(64))
        _agregar_columna_si_falta(inspector, "usuarios", "reset_sesion_expira", sa.DateTime())
        _agregar_columna_si_falta(inspector, "usuarios", "bloqueado_hasta", sa.DateTime())
        for columna in ("reset_pin", "reset_pin_expira"):
            if columna in columnas:
                op.drop_column("usuarios", columna)

    inspector = _inspector()
    tablas = inspector.get_table_names()
    if "intentos_acceso" not in tablas:
        op.create_table(
            "intentos_acceso",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("clave_hash", sa.String(64), nullable=False),
            sa.Column("fecha", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )
    inspector = _inspector()
    _crear_indice_si_falta(inspector, "intentos_acceso", "ix_intentos_acceso_clave_hash", ["clave_hash"])
    _crear_indice_si_falta(inspector, "intentos_acceso", "ix_intentos_acceso_fecha", ["fecha"])

    inspector = _inspector()
    if "subcontratistas" not in inspector.get_table_names():
        op.create_table(
            "subcontratistas",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("proyecto_id", sa.Integer(), nullable=False),
            sa.Column("nombre_empresa", sa.String(150), nullable=False),
            sa.Column("nit", sa.String(50), nullable=False),
            sa.Column("fecha_vencimiento_poliza", sa.Date(), nullable=False),
            sa.Column("fecha_vencimiento_ss", sa.Date(), nullable=False),
            sa.Column("estado", sa.String(50), nullable=False, server_default="Activo"),
            sa.Column("fecha_eliminacion", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["proyecto_id"], ["proyectos_obra.id"], ondelete="CASCADE"),
        )
    inspector = _inspector()
    _crear_indice_si_falta(inspector, "subcontratistas", "ix_subcontratistas_proyecto_id", ["proyecto_id"])

    if bind.dialect.name == "postgresql":
        op.execute(
            sa.text(
                """
                CREATE OR REPLACE FUNCTION validar_stock_antes_de_movimiento()
                RETURNS TRIGGER AS $$
                DECLARE
                    stock_actual FLOAT;
                BEGIN
                    IF NEW.tipo_movimiento = 'Salida' THEN
                        SELECT cantidad_disponible INTO stock_actual
                        FROM inventario_obras
                        WHERE proyecto_id = NEW.proyecto_id AND material_id = NEW.material_id;

                        IF stock_actual IS NULL THEN
                            RAISE EXCEPTION
                                'No hay inventario registrado para el material % en el proyecto %',
                                NEW.material_id, NEW.proyecto_id;
                        END IF;

                        IF stock_actual < NEW.cantidad THEN
                            RAISE EXCEPTION
                                'Stock insuficiente: disponible %, solicitado % (material %, proyecto %)',
                                stock_actual, NEW.cantidad, NEW.material_id, NEW.proyecto_id;
                        END IF;
                    END IF;

                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
                """
            )
        )
        op.execute(sa.text("DROP TRIGGER IF EXISTS trigger_validar_stock ON historial_movimientos"))
        op.execute(
            sa.text(
                """
                CREATE TRIGGER trigger_validar_stock
                    BEFORE INSERT ON historial_movimientos
                    FOR EACH ROW
                    EXECUTE FUNCTION validar_stock_antes_de_movimiento();
                """
            )
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = _inspector()
    tablas = inspector.get_table_names()

    if bind.dialect.name == "postgresql" and "historial_movimientos" in tablas:
        op.execute(sa.text("DROP TRIGGER IF EXISTS trigger_validar_stock ON historial_movimientos"))
        op.execute(sa.text("DROP FUNCTION IF EXISTS validar_stock_antes_de_movimiento()"))

    if "subcontratistas" in tablas:
        op.drop_table("subcontratistas")
    if "intentos_acceso" in tablas:
        op.drop_table("intentos_acceso")

    inspector = _inspector()
    if "usuarios" in inspector.get_table_names():
        columnas = _columnas_existentes(inspector, "usuarios")
        for columna in (
            "reset_token_hash",
            "reset_token_expira",
            "reset_token_usado_en",
            "reset_sesion_hash",
            "reset_sesion_expira",
            "bloqueado_hasta",
        ):
            if columna in columnas:
                op.drop_column("usuarios", columna)
