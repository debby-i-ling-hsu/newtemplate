from django.urls import reverse
from rest_framework.test import APITestCase


class AccountsFlowTests(APITestCase):
    def test_register_login_and_me(self):
        # register
        resp = self.client.post(
            reverse("register"),
            {"username": "alice", "email": "alice@example.com", "password": "Str0ng-Pass-123"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.content)

        # login -> tokens
        resp = self.client.post(
            reverse("login"),
            {"username": "alice", "password": "Str0ng-Pass-123"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        access = resp.data["access"]

        # me (authenticated)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        resp = self.client.get(reverse("me"))
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(resp.data["username"], "alice")

    def test_me_requires_auth(self):
        resp = self.client.get(reverse("me"))
        self.assertEqual(resp.status_code, 401)
