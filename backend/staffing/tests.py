from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from accounts.models import Role

from .models import ServiceArea, StaffSchedule

User = get_user_model()


class StaffingApiTests(APITestCase):
    def setUp(self):
        ServiceArea.objects.create(city="台中市", district="西屯區")
        self.staff = User.objects.create(
            username="0900000001", phone="0900000001", role=Role.TECHNICIAN
        )
        self.customer = User.objects.create(
            username="0912000001", phone="0912000001", role=Role.CUSTOMER
        )

    def test_service_areas_listed(self):
        self.client.force_authenticate(self.staff)
        resp = self.client.get("/api/v1/staffing/service-areas/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["count"], 1)

    def test_staff_can_get_and_submit_schedule(self):
        self.client.force_authenticate(self.staff)
        resp = self.client.put(
            "/api/v1/staffing/schedule/",
            {"month": "2026-07", "slots": {"1-0": True}, "submitted": True},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertTrue(resp.data["submitted"])
        self.assertEqual(StaffSchedule.objects.filter(staff=self.staff).count(), 1)

    def test_customer_cannot_access_schedule(self):
        self.client.force_authenticate(self.customer)
        resp = self.client.get("/api/v1/staffing/schedule/")
        self.assertEqual(resp.status_code, 403)
