"""建立寶傑淨化科技的展示資料（服務 / 套組 / 服務區 / 示範客戶與業務帳號 / 預約）。

用法：python manage.py seed_demo
冪等：可重複執行，不會重複建立（以 phone / 名稱為鍵 get_or_create）。
"""

from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from accounts.models import CustomerProfile, Role, StaffProfile
from bookings.models import Booking, BookingStatus, Completion, ServiceType
from catalog.models import PayrollSetting, Promotion, Service, ServicePackage
from staffing.models import ServiceArea

User = get_user_model()


class Command(BaseCommand):
    help = "建立寶傑淨化科技展示資料"

    def handle(self, *args, **options):
        PayrollSetting.current()

        areas = {}
        for city, dist in [
            ("台中市", "北區"),
            ("台中市", "西屯區"),
            ("台中市", "北屯區"),
            ("台中市", "南屯區"),
            ("台中市", "豐原區"),
        ]:
            area, _ = ServiceArea.objects.get_or_create(city=city, district=dist)
            areas[dist] = area

        services = [
            ("基礎除蟎", "1 張床 + 2 個枕頭", 2300, 90, True, False),
            ("冷氣清洗（分離式）", "單台冷氣清洗", 2500, 90, False, True),
            ("加購一個枕頭", "額外清一個枕頭", 200, 10, False, True),
            ("加購一張床", "額外清一張床墊", 1500, 30, False, True),
            ("加購沙發", "單張沙發除蟎", 1200, 60, False, True),
        ]
        for name, desc, price, dur, base, addon in services:
            Service.objects.get_or_create(
                name=name,
                defaults={
                    "desc": desc,
                    "price": price,
                    "duration": dur,
                    "is_base": base,
                    "is_addon": addon,
                    "active": True,
                },
            )

        for name, total, price in [
            ("基礎除蟎 8 次套組", 8, 16000),
            ("基礎除蟎 16 次套組", 16, 30000),
        ]:
            ServicePackage.objects.get_or_create(
                name=name, defaults={"total": total, "price": price, "active": True}
            )

        Promotion.objects.get_or_create(
            name="新客首次免費體驗",
            defaults={"kind": Promotion.Kind.FREE_TRIAL, "value": 1, "active": True},
        )

        # 業務帳號
        staff_specs = [
            ("0900000001", "陳業務", ["北區", "西屯區", "豐原區"]),
            ("0900000002", "李師傅", ["西屯區", "南屯區", "北屯區"]),
        ]
        staff_users = []
        for phone, name, dists in staff_specs:
            user, _ = User.objects.get_or_create(
                phone=phone,
                defaults={"username": phone, "display_name": name, "role": Role.TECHNICIAN},
            )
            profile, _ = StaffProfile.objects.get_or_create(user=user)
            profile.areas.set([areas[d] for d in dists if d in areas])
            staff_users.append(user)

        # 行政帳號（Django Admin 登入用，預設密碼 admin12345）
        admin_user, created = User.objects.get_or_create(
            phone="0900000003",
            defaults={
                "username": "0900000003",
                "display_name": "行政人員",
                "role": Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin_user.set_password("admin12345")
            admin_user.save()

        # 示範客戶
        cust_specs = [
            ("0912200001", "吳承恩", "西屯區", "市政北二路380號", 5, 8),
            ("0912200003", "鄭家豪", "北屯區", "崇德路二段100號", 11, 16),
        ]
        customers = []
        for phone, name, dist, addr, rem, total in cust_specs:
            user, _ = User.objects.get_or_create(
                phone=phone,
                defaults={"username": phone, "display_name": name, "role": Role.CUSTOMER},
            )
            CustomerProfile.objects.get_or_create(
                user=user,
                defaults={
                    "city": "台中市",
                    "dist": dist,
                    "addr": addr,
                    "pkg_remaining": rem,
                    "pkg_total": total,
                    "onboarded": True,
                },
            )
            customers.append(user)

        # 一筆已完成的預約 + 完工（讓客戶可評分、後台有報表）
        today = date.today()
        if not Booking.objects.filter(customer=customers[0]).exists():
            b = Booking.objects.create(
                customer=customers[0],
                staff=staff_users[0],
                service_type=ServiceType.PACKAGE,
                date=today - timedelta(days=5),
                slot="15:00-18:00",
                status=BookingStatus.DONE,
                address="台中市西屯區市政北二路380號",
            )
            Completion.objects.create(
                booking=b,
                hours=1.5,
                items={"除蟎-枕頭": 2},
                cust_note="已加強臥室除蟎",
                fee=400,
                fee_status=Completion.FeeStatus.PENDING,
                month=b.date.strftime("%Y-%m"),
                signed=True,
            )
            # 一筆即將到來的預約
            Booking.objects.create(
                customer=customers[1],
                staff=staff_users[0],
                service_type=ServiceType.DEMO,
                date=today + timedelta(days=2),
                slot="09:00-12:00",
                status=BookingStatus.CONFIRMED,
                address="台中市北屯區崇德路二段100號",
            )

        self.stdout.write(
            self.style.SUCCESS(
                "展示資料建立完成。\n"
                "  行政後台：phone 0900000003 / 密碼 admin12345（/admin/）\n"
                "  業務 App：0900000001、0900000002（OTP 000000）\n"
                "  客戶 App：0912200001、0912200003（OTP 000000），或用新手機號自助註冊"
            )
        )
