from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ServiceAreaViewSet, StaffScheduleView

router = DefaultRouter()
router.register(r"service-areas", ServiceAreaViewSet, basename="service-area")

urlpatterns = [
    path("schedule/", StaffScheduleView.as_view(), name="staff-schedule"),
    *router.urls,
]
