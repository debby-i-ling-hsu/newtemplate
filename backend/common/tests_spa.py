import tempfile
from pathlib import Path

from django.conf import settings
from django.test import TestCase, override_settings
from django.urls import reverse


class SpaFallbackTests(TestCase):
    def test_spa_fallback_reads_frontend_dist_index(self):
        with tempfile.TemporaryDirectory() as tmp:
            backend_dir = Path(tmp) / "backend"
            index_path = Path(tmp) / "frontend" / "dist" / "index.html"
            backend_dir.mkdir()
            index_path.parent.mkdir(parents=True)
            index_path.write_text(
                '<div id="root"></div><script src="/static/assets/app.js"></script>',
                encoding="utf-8",
            )

            with override_settings(BASE_DIR=backend_dir):
                response = self.client.get(reverse("spa"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "/static/assets/app.js")

    def test_vite_dist_is_collected_under_static_prefix(self):
        self.assertIn(
            settings.BASE_DIR.parent / "frontend" / "dist",
            settings.STATICFILES_DIRS,
        )
