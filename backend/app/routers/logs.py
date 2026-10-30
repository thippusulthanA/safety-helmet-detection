import io
import csv
from datetime import datetime, date, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models_db import ViolationLog
from ..schemas import PaginatedLogsResponse, ViolationLogItem

router = APIRouter(prefix="/api/logs", tags=["Logs"])


@router.get("", response_model=PaginatedLogsResponse)
def get_violation_logs(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    source_type: Optional[str] = Query(None, description="Filter by source: image, video, stream"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Retrieves paginated violation records with optional date and source filtering.
    """
    query = db.query(ViolationLog)

    if source_type and isinstance(source_type, str):
        query = query.filter(ViolationLog.source_type == source_type.lower())

    if start_date and isinstance(start_date, str):
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(ViolationLog.timestamp >= start_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Expected YYYY-MM-DD.")

    if end_date and isinstance(end_date, str):
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            query = query.filter(ViolationLog.timestamp <= end_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Expected YYYY-MM-DD.")

    total = query.count()
    total_pages = max(1, (total + limit - 1) // limit)
    offset = (page - 1) * limit

    items = query.order_by(desc(ViolationLog.timestamp)).offset(offset).limit(limit).all()

    return PaginatedLogsResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.delete("")
def clear_all_violation_logs(db: Session = Depends(get_db)):
    """
    Clears all violation log records from the database.
    """
    deleted_count = db.query(ViolationLog).delete()
    db.commit()
    return {"message": f"Successfully deleted {deleted_count} violation records."}


@router.get("/export")
def export_logs_as_csv(
    source_type: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Exports violation records in CSV format.
    """
    query = db.query(ViolationLog)

    if source_type and isinstance(source_type, str):
        query = query.filter(ViolationLog.source_type == source_type.lower())
    if start_date and isinstance(start_date, str):
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(ViolationLog.timestamp >= start_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Expected YYYY-MM-DD.")
    if end_date and isinstance(end_date, str):
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            query = query.filter(ViolationLog.timestamp <= end_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Expected YYYY-MM-DD.")

    logs = query.order_by(desc(ViolationLog.timestamp)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID",
        "Timestamp (UTC)",
        "Source Type",
        "Source Name",
        "Violation Count",
        "Total Persons",
        "Inference (ms)",
        "Snapshot URL"
    ])

    for log in logs:
        writer.writerow([
            log.id,
            log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else "",
            log.source_type,
            log.source_name,
            log.count,
            log.total_persons,
            log.inference_ms,
            log.snapshot_path or ""
        ])

    output.seek(0)
    filename = f"helmet_violations_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
