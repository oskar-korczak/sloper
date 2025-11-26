"""Pydantic models for API requests."""

from pydantic import BaseModel, Field
from typing import Optional


class SceneMetadata(BaseModel):
    """Metadata for a single scene in the video assembly."""

    index: int = Field(..., description="Scene index (0-based)")
    imageDuration: float = Field(
        ..., gt=0, description="Duration to display this image in seconds"
    )


class Resolution(BaseModel):
    """Video resolution specification."""

    width: int = Field(..., gt=0, le=4096, description="Video width in pixels")
    height: int = Field(..., gt=0, le=4096, description="Video height in pixels")


class AssemblyMetadata(BaseModel):
    """Metadata for video assembly request."""

    scenes: list[SceneMetadata] = Field(
        ..., min_length=1, description="List of scene metadata"
    )
    resolution: Resolution = Field(..., description="Output video resolution")
    frameRate: int = Field(
        default=24, ge=1, le=60, description="Output video frame rate"
    )


class ErrorResponse(BaseModel):
    """Standard error response format."""

    error: str = Field(..., description="Error code")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[dict] = Field(default=None, description="Additional error details")
