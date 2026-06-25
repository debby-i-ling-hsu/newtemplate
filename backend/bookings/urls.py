from rest_framework.routers import DefaultRouter

from .views import (
    BookingViewSet,
    CompensationViewSet,
    CompletionViewSet,
    DispatchViewSet,
)

router = DefaultRouter()
router.register(r"bookings", BookingViewSet, basename="booking")
router.register(r"completions", CompletionViewSet, basename="completion")
router.register(r"compensations", CompensationViewSet, basename="compensation")
router.register(r"dispatch", DispatchViewSet, basename="dispatch")

urlpatterns = router.urls
