from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from accounts.models import CustomerProfile, Role, StaffProfile
from catalog.models import PayrollSetting
from staffing.models import ServiceArea

from .models import Booking, BookingStatus, Compensation, Completion, ServiceType

User = get_user_model()


class BookingFlowTests(APITestCase):
    def setUp(self):
        self.area = ServiceArea.objects.create(city="台中市", district="西屯區")
        self.customer = User.objects.create(
            username="0912000001", phone="0912000001", display_name="王小明", role=Role.CUSTOMER
        )
        CustomerProfile.objects.create(
            user=self.customer, city="台中市", dist="西屯區", addr="文心路100號"
        )
        self.staff_user = User.objects.create(
            username="0900000001", phone="0900000001", display_name="陳業務", role=Role.TECHNICIAN
        )
        sp = StaffProfile.objects.create(user=self.staff_user)
        sp.areas.add(self.area)
        PayrollSetting.objects.create(travel_fee=400)

    def test_customer_order_auto_assigns_matching_staff(self):
        self.client.force_authenticate(self.customer)
        resp = self.client.post(
            "/api/v1/bookings/bookings/",
            {"service_type": "demo", "date": "2026-07-01", "slot": "09:00-12:00"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(resp.data["staff_name"], "陳業務")
        self.assertEqual(resp.data["status"], BookingStatus.CONFIRMED)

    def test_full_loop_order_complete_rate(self):
        # 客戶下單
        self.client.force_authenticate(self.customer)
        booking = Booking.objects.create(
            customer=self.customer,
            staff=self.staff_user,
            service_type=ServiceType.PACKAGE,
            date="2026-07-02",
            slot="12:00-15:00",
            status=BookingStatus.CONFIRMED,
        )

        # 業務完工回報（計車馬費 400）
        self.client.force_authenticate(self.staff_user)
        resp = self.client.post(
            f"/api/v1/bookings/dispatch/{booking.id}/complete/",
            {"hours": 1.5, "items": {"除蟎-枕頭": 2}, "signed": True},
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(resp.data["fee"], 400)
        booking.refresh_from_db()
        self.assertEqual(booking.status, BookingStatus.DONE)

        # 完工回報為 idempotent：重送不重複建立
        self.client.post(
            f"/api/v1/bookings/dispatch/{booking.id}/complete/",
            {"hours": 2, "signed": True},
            format="json",
        )
        self.assertEqual(Completion.objects.filter(booking=booking).count(), 1)

        # 客戶評分 → 更新業務評分
        completion = Completion.objects.get(booking=booking)
        self.client.force_authenticate(self.customer)
        resp = self.client.post(
            f"/api/v1/bookings/completions/{completion.id}/rate/",
            {"rating": 4, "comment": "專業"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        self.staff_user.staff_profile.refresh_from_db()
        self.assertEqual(float(self.staff_user.staff_profile.rating), 4.0)

    def test_abandon_creates_compensation(self):
        booking = Booking.objects.create(
            customer=self.customer,
            staff=self.staff_user,
            service_type=ServiceType.DEMO,
            date="2026-07-03",
            slot="09:00-12:00",
            status=BookingStatus.CONFIRMED,
        )
        self.client.force_authenticate(self.staff_user)
        resp = self.client.post(
            f"/api/v1/bookings/dispatch/{booking.id}/abandon/",
            {"reason": "臨時無法出行"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        booking.refresh_from_db()
        self.assertEqual(booking.status, BookingStatus.ABANDONED)
        self.assertTrue(Compensation.objects.filter(customer=self.customer).exists())

    def test_role_isolation_customer_cannot_use_dispatch(self):
        self.client.force_authenticate(self.customer)
        resp = self.client.get("/api/v1/bookings/dispatch/")
        self.assertEqual(resp.status_code, 403)

    def test_role_isolation_staff_cannot_create_booking(self):
        self.client.force_authenticate(self.staff_user)
        resp = self.client.post(
            "/api/v1/bookings/bookings/",
            {"service_type": "demo", "date": "2026-07-01", "slot": "09:00-12:00"},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

    def test_customer_only_sees_own_bookings(self):
        other = User.objects.create(username="0912000099", phone="0912000099", role=Role.CUSTOMER)
        Booking.objects.create(
            customer=other,
            service_type=ServiceType.DEMO,
            date="2026-07-05",
            slot="09:00-12:00",
        )
        Booking.objects.create(
            customer=self.customer,
            service_type=ServiceType.DEMO,
            date="2026-07-06",
            slot="09:00-12:00",
        )
        self.client.force_authenticate(self.customer)
        resp = self.client.get("/api/v1/bookings/bookings/")
        self.assertEqual(resp.data["count"], 1)
