from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import RegisterSerializer, UserSerializer


class LoginView(TokenObtainPairView):
    """登入端點額外套用較嚴的限流（scope=login），防暴力嘗試。

    DDoS middleware 是邊界 IP 限流；這層是應用層、針對登入端點的細緻限流，
    兩者互補。速率見 settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["login"]。
    """

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses=UserSerializer)
    def get(self, request):
        return Response(UserSerializer(request.user).data)
