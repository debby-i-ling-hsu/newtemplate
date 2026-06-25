from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import PayrollSetting, Service, ServicePackage

User = get_user_model()


class CatalogApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create(username="0912000000", phone="0912000000")
        Service.objects.create(name="基礎除蟎", price=2300, is_base=True, active=True)
        Service.objects.create(name="停用項目", price=100, is_addon=True, active=False)
        ServicePackage.objects.create(name="8 次套組", total=8, price=16000, active=True)

    def test_services_list_only_active(self):
        self.client.force_authenticate(self.user)
        resp = self.client.get("/api/v1/catalog/services/")
        self.assertEqual(resp.status_code, 200)
        names = [s["name"] for s in resp.data["results"]]
        self.assertIn("基礎除蟎", names)
        self.assertNotIn("停用項目", names)

    def test_package_unit_price(self):
        self.client.force_authenticate(self.user)
        resp = self.client.get("/api/v1/catalog/packages/")
        self.assertEqual(resp.data["results"][0]["unit_price"], 2000)

    def test_payroll_singleton(self):
        a = PayrollSetting.current()
        a.travel_fee = 500
        a.save()
        self.assertEqual(PayrollSetting.objects.count(), 1)
        self.assertEqual(PayrollSetting.current().travel_fee, 500)
