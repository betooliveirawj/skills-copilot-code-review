"""
Announcement endpoints for the High School Management System API
"""

from datetime import date
from typing import Any, Dict, List, Optional
import logging

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, field_validator
from bson import ObjectId

from ..database import announcements_collection, teachers_collection

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/announcements",
    tags=["announcements"]
)


class AnnouncementPayload(BaseModel):
    message: str
    expires_on: str
    start_date: Optional[str] = None

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Message cannot be empty")
        return trimmed

    @field_validator("expires_on")
    @classmethod
    def validate_expires_on(cls, value: str) -> str:
        try:
            date.fromisoformat(value)
        except ValueError as exc:
            raise ValueError("Expiration date must be in YYYY-MM-DD format") from exc
        return value

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value == "":
            return None

        try:
            date.fromisoformat(value)
        except ValueError as exc:
            raise ValueError("Start date must be in YYYY-MM-DD format") from exc
        return value


class AnnouncementUpdatePayload(BaseModel):
    message: Optional[str] = None
    expires_on: Optional[str] = None
    start_date: Optional[str] = None

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value

        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Message cannot be empty")
        return trimmed

    @field_validator("expires_on")
    @classmethod
    def validate_expires_on(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value

        try:
            date.fromisoformat(value)
        except ValueError as exc:
            raise ValueError("Expiration date must be in YYYY-MM-DD format") from exc
        return value

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value == "":
            return None

        try:
            date.fromisoformat(value)
        except ValueError as exc:
            raise ValueError("Start date must be in YYYY-MM-DD format") from exc
        return value


def _ensure_signed_in_user(username: Optional[str]) -> Dict[str, Any]:
    if not username:
        raise HTTPException(status_code=401, detail="Authentication required")

    teacher = teachers_collection.find_one({"_id": username})
    if not teacher:
        raise HTTPException(status_code=401, detail="Invalid teacher credentials")

    return teacher


def _normalize_announcement(document: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(document["_id"]),
        "message": document["message"],
        "start_date": document.get("start_date"),
        "expires_on": document["expires_on"]
    }


@router.get("/active", response_model=List[Dict[str, Any]])
def get_active_announcements() -> List[Dict[str, Any]]:
    """Get all announcements currently active for public display."""
    today = date.today().isoformat()

    query = {
        "expires_on": {"$gte": today},
        "$or": [
            {"start_date": None},
            {"start_date": {"$exists": False}},
            {"start_date": {"$lte": today}}
        ]
    }

    try:
        cursor = announcements_collection.find(query).sort(
            [("start_date", 1), ("expires_on", 1)]
        )
        return [_normalize_announcement(document) for document in cursor]
    except Exception:
        logger.exception("Failed to fetch active announcements")
        raise HTTPException(
            status_code=500,
            detail="Failed to load announcements"
        )


@router.get("", response_model=List[Dict[str, Any]])
def get_announcements(teacher_username: Optional[str] = Query(None)) -> List[Dict[str, Any]]:
    """Get all announcements for management. Requires authentication."""
    _ensure_signed_in_user(teacher_username)

    try:
        cursor = announcements_collection.find({}).sort("expires_on", 1)
        return [_normalize_announcement(document) for document in cursor]
    except Exception:
        logger.exception("Failed to fetch announcements list")
        raise HTTPException(
            status_code=500,
            detail="Failed to load announcements"
        )


@router.post("", response_model=Dict[str, Any])
def create_announcement(
    payload: AnnouncementPayload,
    teacher_username: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Create a new announcement. Requires authentication."""
    _ensure_signed_in_user(teacher_username)

    start_date = payload.start_date
    expires_on = payload.expires_on

    if start_date and start_date > expires_on:
        raise HTTPException(
            status_code=400,
            detail="Start date cannot be after expiration date"
        )

    document = {
        "message": payload.message,
        "start_date": start_date,
        "expires_on": expires_on
    }

    try:
        result = announcements_collection.insert_one(document)
        created = announcements_collection.find_one({"_id": result.inserted_id})
        if not created:
            raise HTTPException(status_code=500, detail="Failed to create announcement")

        return _normalize_announcement(created)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to create announcement")
        raise HTTPException(
            status_code=500,
            detail="Failed to create announcement"
        )


@router.put("/{announcement_id}", response_model=Dict[str, Any])
def update_announcement(
    announcement_id: str,
    payload: AnnouncementUpdatePayload,
    teacher_username: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Update an existing announcement. Requires authentication."""
    _ensure_signed_in_user(teacher_username)

    try:
        object_id = ObjectId(announcement_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid announcement id")

    existing = announcements_collection.find_one({"_id": object_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Announcement not found")

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No changes provided")

    next_start = updates.get("start_date", existing.get("start_date"))
    next_expiration = updates.get("expires_on", existing.get("expires_on"))

    if next_start and next_start > next_expiration:
        raise HTTPException(
            status_code=400,
            detail="Start date cannot be after expiration date"
        )

    try:
        announcements_collection.update_one(
            {"_id": object_id},
            {"$set": updates}
        )
        updated = announcements_collection.find_one({"_id": object_id})
        if not updated:
            raise HTTPException(status_code=404, detail="Announcement not found")

        return _normalize_announcement(updated)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to update announcement")
        raise HTTPException(
            status_code=500,
            detail="Failed to update announcement"
        )


@router.delete("/{announcement_id}")
def delete_announcement(
    announcement_id: str,
    teacher_username: Optional[str] = Query(None)
) -> Dict[str, str]:
    """Delete an announcement. Requires authentication."""
    _ensure_signed_in_user(teacher_username)

    try:
        object_id = ObjectId(announcement_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid announcement id")

    try:
        result = announcements_collection.delete_one({"_id": object_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Announcement not found")
        return {"message": "Announcement deleted"}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to delete announcement")
        raise HTTPException(
            status_code=500,
            detail="Failed to delete announcement"
        )
