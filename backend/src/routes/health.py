"""Health check endpoint."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint for load balancer.

    Returns:
        Status and version information
    """
    return {"status": "healthy", "version": "1.0.0"}
