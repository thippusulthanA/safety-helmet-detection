def test_health_endpoint(client):
    """Verifies that GET /api/health responds with 200 and expected metadata."""
    response = client.get("/api/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "ok"
    assert "model_name" in data
    assert "device" in data
    assert "demo_mode" in data
    assert isinstance(data["demo_mode"], bool)
    assert data["version"] == "1.0.0"


def test_root_endpoint(client):
    """Verifies GET / returns application info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "running"
    assert "Safety Helmet Detection" in data["app"]

