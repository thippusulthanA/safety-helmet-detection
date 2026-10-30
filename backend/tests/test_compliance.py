import pytest
from backend.app.services.compliance import ComplianceEngine, StreamDebouncer
from backend.app.models_db import ViolationLog


def test_compliance_status_rules():
    """Verifies that status is ALERT if any head is detected, else SAFE."""
    assert ComplianceEngine.evaluate_status({"helmet": 5, "head": 0, "person": 5}) == "SAFE"
    assert ComplianceEngine.evaluate_status({"helmet": 0, "head": 1, "person": 1}) == "ALERT"
    assert ComplianceEngine.evaluate_status({"helmet": 10, "head": 2, "person": 12}) == "ALERT"
    assert ComplianceEngine.evaluate_status({}) == "SAFE"


def test_stream_debouncer_behavior():
    """
    Verifies that a violation must persist for 3 consecutive frames before logging,
    and then enters cooldown.
    """
    debouncer = StreamDebouncer(required_frames=3, cooldown_frames=10)

    # Frame 1: ALERT -> not debounced yet
    is_alert, should_log = debouncer.update(is_alert=True)
    assert not is_alert
    assert not should_log

    # Frame 2: ALERT -> still not reached 3
    is_alert, should_log = debouncer.update(is_alert=True)
    assert not is_alert
    assert not should_log

    # Frame 3: ALERT -> reaches 3! Must trigger log
    is_alert, should_log = debouncer.update(is_alert=True)
    assert is_alert
    assert should_log

    # Frame 4: ALERT -> continues alert, but should not spam log (cooldown active)
    is_alert, should_log = debouncer.update(is_alert=True)
    assert is_alert
    assert not should_log

    # Safe frame -> resets consecutive counter
    is_alert, should_log = debouncer.update(is_alert=False)
    assert not is_alert
    assert not should_log
    assert debouncer.consecutive_violations == 0


def test_log_violation_in_database(db_session):
    """Verifies persistence of violation record to SQLite."""
    record = ComplianceEngine.log_violation(
        db=db_session,
        source_type="image",
        source_name="test_worker.jpg",
        count=2,
        total_persons=3,
        snapshot_path="/static/snapshots/test.jpg",
        inference_ms=18.5
    )

    assert record.id is not None
    assert record.count == 2
    assert record.source_name == "test_worker.jpg"
    assert record.source_type == "image"
    assert record.snapshot_path == "/static/snapshots/test.jpg"

    # Query back from DB
    queried = db_session.query(ViolationLog).filter(ViolationLog.id == record.id).first()
    assert queried is not None
    assert queried.total_persons == 3

