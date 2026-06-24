"""Expose the Celery app so shared_task picks up the default app on import."""

from .celery import app as celery_app

__all__ = ("celery_app",)
