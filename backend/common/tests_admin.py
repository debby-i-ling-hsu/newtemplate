from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse


class AdminSiteSmokeTests(TestCase):
    def setUp(self) -> None:
        self.user = get_user_model().objects.create_superuser(
            username="admin",
            email="admin@example.com",
            password="test-password",
        )
        self.client.force_login(self.user)

    def test_admin_index_renders(self) -> None:
        response = self.client.get(reverse("admin:index"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "fullstackapp 後台")

    def test_example_model_changelist_renders(self) -> None:
        response = self.client.get(reverse("admin:items_item_changelist"))

        self.assertEqual(response.status_code, 200)

    def test_user_add_form_renders(self) -> None:
        response = self.client.get(reverse("admin:accounts_user_add"))

        self.assertEqual(response.status_code, 200)
