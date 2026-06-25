from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import Role

User = get_user_model()


class OtpAuthTests(APITestCase):
    def test_request_otp_ok(self):
        resp = self.client.post(
            "/api/v1/accounts/otp/request/", {"phone": "0912345678"}, format="json"
        )
        self.assertEqual(resp.status_code, 200, resp.content)

    def test_verify_creates_customer_and_returns_tokens(self):
        resp = self.client.post(
            "/api/v1/accounts/otp/verify/",
            {"phone": "0912345678", "code": "000000", "display_name": "新客戶"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertIn("access", resp.data)
        self.assertEqual(resp.data["user"]["role"], Role.CUSTOMER)
        user = User.objects.get(phone="0912345678")
        self.assertEqual(user.role, Role.CUSTOMER)
        self.assertFalse(user.has_usable_password())

    def test_verify_wrong_code_rejected(self):
        resp = self.client.post(
            "/api/v1/accounts/otp/verify/",
            {"phone": "0912345678", "code": "123456"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_existing_staff_keeps_role_on_login(self):
        User.objects.create(
            username="0900000002", phone="0900000002", role=Role.TECHNICIAN, display_name="陳業務"
        )
        resp = self.client.post(
            "/api/v1/accounts/otp/verify/",
            {"phone": "0900000002", "code": "000000"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(resp.data["user"]["role"], Role.TECHNICIAN)

    def test_me_get_and_patch(self):
        verify = self.client.post(
            "/api/v1/accounts/otp/verify/",
            {"phone": "0912345678", "code": "000000"},
            format="json",
        )
        access = verify.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        resp = self.client.get("/api/v1/accounts/me/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["phone"], "0912345678")

        resp = self.client.patch(
            "/api/v1/accounts/me/",
            {"display_name": "王小明", "city": "台中市", "dist": "西屯區", "onboarded": True},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(resp.data["display_name"], "王小明")
        self.assertTrue(resp.data["customer_profile"]["onboarded"])

    def test_me_requires_auth(self):
        resp = self.client.get("/api/v1/accounts/me/")
        self.assertEqual(resp.status_code, 401)
