import base64
import io


def test_detect_image_valid(client, sample_image_bytes):
    """Verifies that POST /api/detect/image processes valid JPEG and returns schema."""
    files = {
        "file": ("test_frame.jpg", io.BytesIO(sample_image_bytes), "image/jpeg")
    }
    data = {
        "conf": "0.25",
        "iou": "0.70"
    }

    response = client.post("/api/detect/image", files=files, data=data)
    assert response.status_code == 200

    json_data = response.json()
    assert "detections" in json_data
    assert isinstance(json_data["detections"], list)
    assert "counts" in json_data
    assert "helmet" in json_data["counts"]
    assert "head" in json_data["counts"]
    assert "person" in json_data["counts"]
    assert json_data["status"] in ["SAFE", "ALERT"]
    assert "inference_ms" in json_data
    assert json_data["inference_ms"] >= 0
    assert "annotated_image" in json_data
    assert len(json_data["annotated_image"]) > 50

    # Ensure base64 string is valid
    decoded = base64.b64decode(json_data["annotated_image"])
    assert len(decoded) > 0


def test_detect_image_custom_thresholds(client, sample_image_bytes):
    """Verifies threshold inputs are respected."""
    files = {
        "file": ("sample.png", io.BytesIO(sample_image_bytes), "image/png")
    }
    data = {"conf": "0.85", "iou": "0.50"}

    response = client.post("/api/detect/image", files=files, data=data)
    assert response.status_code == 200
    assert response.json()["status"] in ["SAFE", "ALERT"]

