"""Compara el esquema del ORM (rama test) con el de PostgreSQL y propose el DDL faltante."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import inspect  # noqa: E402

from app.core.database import engine  # noqa: E402
from app import models  # noqa: E402,F401
from app.core.database import Base  # noqa: E402

inspector = inspect(engine)
tablas = set(inspector.get_table_names())

print("=" * 70)
print("TABLAS QUE FALTAN EN POSTGRESQL")
print("=" * 70)
faltan_tablas = []
for tabla in Base.metadata.sorted_tables:
    if tabla.name not in tablas:
        faltan_tablas.append(tabla.name)
        print(f"  - {tabla.name}  ({len(tabla.columns)} columnas)")
if not faltan_tablas:
    print("  (ninguna)")

print()
print("=" * 70)
print("COLUMNAS QUE FALTAN EN POSTGRESQL")
print("=" * 70)
faltan_columnas = []
for tabla in Base.metadata.sorted_tables:
    if tabla.name not in tablas:
        continue
    existentes = {c["name"]: c for c in inspector.get_columns(tabla.name)}
    for columna in tabla.columns:
        if columna.name not in existentes:
            faltan_columnas.append((tabla.name, columna.name))
            tipo = str(columna.type)
            null = "NULL" if columna.nullable else "NOT NULL"
            fk = ""
            for f in columna.foreign_keys:
                fk = f" -> {f.target_fullname}"
            print(f"  - {tabla.name}.{columna.name} {tipo} {null}{fk}")

if not faltan_columnas:
    print("  (ninguna)")

print()
print("=" * 70)
print("COLUMNAS EXTRA EN POSTGRESQL (no rompen, pero sobran)")
print("=" * 70)
for tabla in Base.metadata.sorted_tables:
    if tabla.name not in tablas:
        continue
    existentes = {c["name"] for c in inspector.get_columns(tabla.name)}
    declaradas = {c.name for c in tabla.columns}
    extras = sorted(existentes - declaradas)
    if extras:
        print(f"  - {tabla.name}: {', '.join(extras)}")
