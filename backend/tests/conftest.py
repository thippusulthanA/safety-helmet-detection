import io
import pytest
import numpy as np
import cv2
from PIL import Image
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.main import app
from backend.app.database import Base, get_db
from backend.app.services.detector import YOLOv8Detector

# Use in-memory SQLite for testing
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_detector():
    """Ensure detector singleton is initialized for test suite."""
    detector = YOLOv8Detector.get_instance()
    detector.load_model()
    yield detector


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for a test."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI test client with overridden database dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_image_bytes():
    """Generates a valid JPEG image in bytes."""
    # Create an RGB image (300x300) with colored shapes
    img = np.zeros((300, 300, 3), dtype=np.uint8)
    img[:] = (200, 200, 200)  # gray background
    # Add a rectangle
    cv2.rectangle(img, (50, 50), (250, 250), (34, 197, 94), -1)
    # Encode as JPEG
    success, encoded = cv2.imencode(".jpg", img)
    return encoded.tobytes()

