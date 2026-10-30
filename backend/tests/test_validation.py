import io


def test_detect_image_invalid_extension(client):
    """Verifies that uploading a text or non-image file is rejected with 400 Bad Request."""
    files = {
        "file": ("malicious.txt", io.BytesIO(b"Hello world this is not an image"), "text/plain")
    }
    response = client.post("/api/detect/image", files=files)
    assert response.status_code == 400
    assert "Unsupported image type" in response.json()["detail"]


def test_detect_image_corrupted_data(client):
    """Verifies that uploading corrupted image bytes is rejected with 400 Bad Request."""
    files = {
        "file": ("corrupt.jpg", io.BytesIO(b"garbage bytes not a valid jpg"), "image/jpeg")
    }
    response = client.post("/api/detect/image", files=files)
    assert response.status_code == 400
    assert "Failed to decode image" in response.json()["detail"]


def test_video_invalid_extension(client):
    """Verifies that uploading an invalid video extension is rejected with 400."""
    files = {
        "file": ("notes.pdf", io.BytesIO(b"%PDF-1.4 fake pdf"), "application/pdf")
    }
    response = client.post("/api/detect/video", files=files)
    assert response.status_code == 400
    assert "Unsupported video extension" in response.json()["detail"]


def test_video_job_not_found(client):
    """Verifies that requesting a nonexistent video job returns 404."""
    response = client.get("/api/detect/video/non-existent-uuid-12345")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_logs_invalid_date_format(client):
    """Verifies that invalid date format returns 400."""
    response = client.get("/api/logs?start_date=2026/10/30")
    assert response.status_code == 400
    assert "Invalid start_date format" in response.json()["detail"]

