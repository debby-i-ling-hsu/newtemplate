import json
from unittest.mock import patch

from django.test import RequestFactory, TestCase, override_settings

from .views import health_ready


class HealthReadyWorkerTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()

    @override_settings(
        ALLOWED_HOSTS=["testserver"],
        CELERY_BROKER_URL="memory://",
        CELERY_REQUIRED_WORKERS=[
            "worker-default",
            "worker-maintenance",
            "worker-long-running",
        ],
    )
    @patch(
        "common.views._scan_heartbeat_keys",
        return_value=[
            "celery:heartbeat:<celery.worker.heartbeat.Heart object at 0xabc>",
            "celery:heartbeat:celery@worker-default",
            "celery:heartbeat:celery@worker-maintenance",
            "celery:heartbeat:celery@worker-long-running",
        ],
    )
    def test_ready_accepts_celery_prefixed_worker_heartbeats(self, _scan_keys):
        response = health_ready(self.factory.get("/healthz/ready/"))
        payload = json.loads(response.content)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["checks"]["workers"], "ok")
        self.assertEqual(
            payload["metrics"]["workers_online"],
            [
                "celery@worker-default",
                "celery@worker-long-running",
                "celery@worker-maintenance",
                "worker-default",
                "worker-long-running",
                "worker-maintenance",
            ],
        )
