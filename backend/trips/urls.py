from django.urls import path
from django.http import JsonResponse
from .views import PlanTripView


def health(request):
    """Simple health check — used by Docker HEALTHCHECK and load balancers."""
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("trip/plan/", PlanTripView.as_view(), name="plan-trip"),
    path("health/", health, name="health"),
]
