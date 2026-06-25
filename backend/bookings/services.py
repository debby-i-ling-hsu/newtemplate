"""預約 / 派工 / 完工 / 計酬商業邏輯層。

view 只處理 HTTP，規則寫在這裡。敏感狀態變更（完工、棄單）照
items/services.py:complete_item 的骨架：transaction.atomic + select_for_update + idempotent。

注意：自動派工、車馬費、推播皆為**模擬**，金額一律試算、不碰金流。
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import QuerySet

from accounts.models import StaffProfile, StaffStatus
from catalog.models import PayrollSetting

from .models import (
    Booking,
    BookingStatus,
    Compensation,
    Completion,
    OperationLog,
    ServiceType,
)

User = get_user_model()


def log(actor: str, action: str, target: str = "") -> None:
    OperationLog.objects.create(actor=actor, action=action, target=target)


def auto_assign(*, district: str) -> User | None:
    """挑一位服務區涵蓋該行政區且在線的業務；找不到則回任一在線業務。"""
    online = StaffProfile.objects.filter(status=StaffStatus.ONLINE).select_related("user")
    matched = online.filter(areas__district=district).first()
    chosen = matched or online.first()
    return chosen.user if chosen else None


# ---------------------------------------------------------------------------
# 建立預約
# ---------------------------------------------------------------------------
@transaction.atomic
def create_booking(
    *,
    customer: User,
    service_type: str,
    date,
    slot: str,
    has_pets: bool = False,
    has_baby: bool = False,
    note: str = "",
    ac_type: str = "",
    units: int = 0,
    price: int = 0,
) -> Booking:
    profile = getattr(customer, "customer_profile", None)
    district = profile.dist if profile else ""
    address = profile.full_address if profile else ""

    staff = auto_assign(district=district)
    booking = Booking.objects.create(
        customer=customer,
        staff=staff,
        service_type=service_type,
        date=date,
        slot=slot,
        status=BookingStatus.CONFIRMED if staff else BookingStatus.PENDING,
        address=address,
        has_pets=has_pets,
        has_baby=has_baby,
        note=note,
        ac_type=ac_type,
        units=units,
        price=price,
        auto_assigned=True,
    )

    # 套組服務扣一次次數（demo / ac 不扣）
    if service_type == ServiceType.PACKAGE and profile and profile.pkg_remaining > 0:
        profile.pkg_remaining -= 1
        profile.save(update_fields=["pkg_remaining", "updated_at"])

    label = {
        ServiceType.DEMO: "免費體驗",
        ServiceType.PACKAGE: "套組服務",
        ServiceType.AC: "冷氣清洗",
    }.get(service_type, "服務")
    log(
        customer.display_name or customer.phone or "客戶",
        f"客戶建立{label}預約",
        f"{date} {slot}" + (f" · 指派 {staff.display_name}" if staff else " · 待派工"),
    )
    return booking


def list_customer_bookings(customer: User) -> QuerySet[Booking]:
    return Booking.objects.filter(customer=customer).select_related("staff")


@transaction.atomic
def cancel_booking(*, customer: User, booking_id) -> Booking:
    booking = Booking.objects.select_for_update().get(customer=customer, id=booking_id)
    if booking.status in {BookingStatus.PENDING, BookingStatus.CONFIRMED}:
        booking.status = BookingStatus.CANCELLED
        booking.save(update_fields=["status", "updated_at"])
        log(customer.display_name or "客戶", "客戶取消預約", str(booking))
    return booking


# ---------------------------------------------------------------------------
# 業務端：派工 / 完工 / 棄單
# ---------------------------------------------------------------------------
def list_staff_dispatch(staff: User, *, on_date=None) -> QuerySet[Booking]:
    qs = Booking.objects.filter(staff=staff).exclude(
        status__in=[BookingStatus.CANCELLED, BookingStatus.ABANDONED]
    )
    if on_date is not None:
        qs = qs.filter(date=on_date)
    return qs.select_related("customer", "customer__customer_profile")


@transaction.atomic
def submit_completion(
    *,
    staff: User,
    booking_id,
    hours,
    items: dict,
    cust_note: str = "",
    internal_note: str = "",
    signed: bool = False,
) -> Completion:
    """送出完工回報（idempotent）。demo 無車馬費，其餘以薪資參數車馬費計酬。"""
    booking = Booking.objects.select_for_update().get(staff=staff, id=booking_id)
    existing = Completion.objects.filter(booking=booking).first()
    if existing is not None:
        return existing

    fee = 0 if booking.service_type == ServiceType.DEMO else PayrollSetting.current().travel_fee
    completion = Completion.objects.create(
        booking=booking,
        hours=hours,
        items=items,
        cust_note=cust_note,
        internal_note=internal_note,
        fee=fee,
        fee_status=Completion.FeeStatus.PENDING if fee else Completion.FeeStatus.NONE,
        month=booking.date.strftime("%Y-%m"),
        signed=signed,
    )
    booking.status = BookingStatus.DONE
    booking.save(update_fields=["status", "updated_at"])
    log(
        staff.display_name or "業務",
        "業務完工回報",
        f"{booking} · " + (f"車馬費 {fee}" if fee else "Demo 無車馬費"),
    )
    return completion


@transaction.atomic
def abandon_booking(*, staff: User, booking_id, reason: str) -> Booking:
    """業務棄單：狀態轉棄單、客戶獲補償、模擬推播補單給其他業務。"""
    booking = Booking.objects.select_for_update().get(staff=staff, id=booking_id)
    if booking.status in {BookingStatus.DONE, BookingStatus.CANCELLED, BookingStatus.ABANDONED}:
        return booking
    booking.status = BookingStatus.ABANDONED
    booking.save(update_fields=["status", "updated_at"])
    Compensation.objects.create(
        customer=booking.customer, booking=booking, reason=f"業務棄單：{reason}"
    )
    log(
        staff.display_name or "業務",
        "業務棄單",
        f"{booking.customer.display_name}｜{reason}（已推播補單、客戶獲補償）",
    )
    return booking


# ---------------------------------------------------------------------------
# 客戶評分
# ---------------------------------------------------------------------------
def list_customer_completions(customer: User) -> QuerySet[Completion]:
    return Completion.objects.filter(booking__customer=customer).select_related(
        "booking", "booking__staff"
    )


@transaction.atomic
def rate_completion(*, customer: User, completion_id, rating: int, comment: str = "") -> Completion:
    completion = Completion.objects.select_for_update().get(
        booking__customer=customer, id=completion_id
    )
    completion.rating = rating
    completion.comment = comment
    completion.save(update_fields=["rating", "comment", "updated_at"])

    staff = completion.booking.staff
    if staff is not None and hasattr(staff, "staff_profile"):
        rated = Completion.objects.filter(booking__staff=staff, rating__gt=0)
        avg = sum(c.rating for c in rated) / rated.count()
        staff.staff_profile.rating = round(avg, 1)
        staff.staff_profile.save(update_fields=["rating", "updated_at"])

    log(
        customer.display_name or "客戶", "客戶評分", f"{staff} {rating}★" if staff else f"{rating}★"
    )
    return completion
