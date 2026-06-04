from django.urls import path
from . import views

urlpatterns = [
    path("healthz", views.healthz),
    path("profile", views.profile_view),
    path("trip/geocode", views.geocode_view),
    path("trip/plan", views.plan_trip),
    path("trip/saved", views.SavedTripsView.as_view()),
    path("trip/saved/<int:trip_id>", views.SavedTripDetailView.as_view()),
]
