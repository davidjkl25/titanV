import os
import tempfile

os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("JWT_SECRET_KEY", "clave_de_prueba_larga_y_aleatoria_0123456789")
_archivo_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_archivo_db.close()
os.environ["DATABASE_URL"] = f"sqlite:///{_archivo_db.name}"

import pytest
from fastapi.testclient import TestClient

from app.core.database import Base, engine
from app.main import app


@pytest.fixture(autouse=True)
def base_de_datos_limpia():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    with TestClient(app) as cliente:
        yield cliente
