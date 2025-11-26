"""Slop Video Assembly API - FastAPI application."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import health, assemble

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

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

# Include routers
app.include_router(health.router)
app.include_router(assemble.router)


@app.on_event("startup")
async def startup_event():
    """Log startup information."""
    logging.getLogger(__name__).info("Slop Video Assembly API started")
