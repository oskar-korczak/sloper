"""Slop Video Assembly API - FastAPI application."""

import logging
import os
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .routes import health, assemble

# Configure logging
# Use Google Cloud Logging if running on Cloud Run
if os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("K_SERVICE"):
    try:
        import google.cloud.logging
        client = google.cloud.logging.Client()
        client.setup_logging()
    except ImportError:
        logging.warning("google-cloud-logging not installed, using default logging")
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        )
else:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Slop Video Assembly API",
    description="API for assembling images and audio into videos using FFmpeg",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:5174",  # Vite dev server (alternate port)
        "http://localhost:5175",  # Vite dev server (alternate port)
        "http://localhost:5176",  # Vite dev server (alternate port)
        "http://localhost:4173",  # Vite preview server
        "https://*.github.io",  # GitHub Pages
    ],
    allow_origin_regex=r"https://.*\.github\.io",  # More permissive regex for GitHub Pages
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Video-Duration", "Content-Disposition"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests with timing and status."""
    start_time = time.time()

    # Skip logging for health checks
    if request.url.path == "/health":
        return await call_next(request)

    try:
        response = await call_next(request)
        duration_ms = round((time.time() - start_time) * 1000)

        logger.info(
            "Request completed",
            extra={
                "path": request.url.path,
                "method": request.method,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "client_ip": request.client.host if request.client else None,
            }
        )

        return response
    except Exception as e:
        duration_ms = round((time.time() - start_time) * 1000)

        logger.exception(
            "Request failed",
            extra={
                "path": request.url.path,
                "method": request.method,
                "error": str(e),
                "duration_ms": duration_ms,
                "client_ip": request.client.host if request.client else None,
            }
        )
        raise


# Include routers
app.include_router(health.router)
app.include_router(assemble.router)


@app.on_event("startup")
async def startup_event():
    """Log startup information."""
    logger.info(
        "Slop Video Assembly API started",
        extra={
            "environment": "cloud" if os.getenv("K_SERVICE") else "local",
            "version": "1.0.0",
        }
    )
