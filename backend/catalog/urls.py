from rest_framework.routers import DefaultRouter

from .views import ServicePackageViewSet, ServiceViewSet

router = DefaultRouter()
router.register(r"services", ServiceViewSet, basename="service")
router.register(r"packages", ServicePackageViewSet, basename="package")

urlpatterns = router.urls
