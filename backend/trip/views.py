import requests as http_requests
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
import json
import logging

from .models import SavedTrip, DriverProfile
from .hos_calculator import calculate_trip

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OSRM_URL = "https://router.project-osrm.org/route/v1/driving"
HEADERS = {"User-Agent": "ELD-Trip-Planner/1.0 Django"}


def geocode_single(location: str) -> dict:
    resp = http_requests.get(
        NOMINATIM_URL,
        params={"q": location, "format": "json", "limit": 1},
        headers=HEADERS,
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    if not data:
        raise ValueError(f"Could not geocode: {location}")
    item = data[0]
    return {
        "lat": float(item["lat"]),
        "lng": float(item["lon"]),
        "name": item["display_name"].split(",")[0],
    }


def get_osrm_route(from_coord: dict, to_coord: dict) -> dict:
    url = f"{OSRM_URL}/{from_coord['lng']},{from_coord['lat']};{to_coord['lng']},{to_coord['lat']}"
    resp = http_requests.get(
        url,
        params={"overview": "full", "geometries": "geojson"},
        headers=HEADERS,
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    if not data.get("routes"):
        raise ValueError("No route found from OSRM")
    route = data["routes"][0]
    distance_miles = route["distance"] * 0.000621371
    coords = [{"lat": c[1], "lng": c[0]} for c in route["geometry"]["coordinates"]]
    return {"distanceMiles": distance_miles, "coordinates": coords}


def _profile_to_dict(p):
    return {
        "driverName": p.driver_name,
        "carrierName": p.carrier_name,
        "truckNumber": p.truck_number,
        "licenseNumber": p.license_number,
        "homeTerminal": p.home_terminal,
    }


def get_or_create_profile():
    profile, _ = DriverProfile.objects.get_or_create(pk=1)
    return profile


def healthz(request):
    return JsonResponse({"status": "ok"})


def geocode_view(request):
    q = request.GET.get("q", "").strip()
    if not q:
        return JsonResponse({"error": "Missing query parameter 'q'"}, status=400)
    try:
        resp = http_requests.get(
            NOMINATIM_URL,
            params={"q": q, "format": "json", "limit": 5, "addressdetails": 1},
            headers=HEADERS,
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        results = [{"displayName": item["display_name"], "lat": float(item["lat"]), "lng": float(item["lon"])} for item in data]
        return JsonResponse(results, safe=False)
    except Exception as exc:
        logger.error("Geocode error: %s", exc)
        return JsonResponse({"error": "Geocoding failed"}, status=500)


@csrf_exempt
def plan_trip(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    current_location = body.get("currentLocation", "").strip()
    pickup_location = body.get("pickupLocation", "").strip()
    dropoff_location = body.get("dropoffLocation", "").strip()
    cycle_hours_raw = body.get("currentCycleUsedHours", 0)

    if not current_location or not pickup_location or not dropoff_location:
        return JsonResponse({"error": "currentLocation, pickupLocation, and dropoffLocation are required"}, status=400)

    try:
        current_cycle_used_hours = float(cycle_hours_raw)
    except (TypeError, ValueError):
        return JsonResponse({"error": "currentCycleUsedHours must be a number"}, status=400)

    if not (0 <= current_cycle_used_hours <= 70):
        return JsonResponse({"error": "currentCycleUsedHours must be between 0 and 70"}, status=400)

    try:
        current_geo = geocode_single(current_location)
        pickup_geo = geocode_single(pickup_location)
        dropoff_geo = geocode_single(dropoff_location)
    except ValueError as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    except Exception as exc:
        logger.error("Geocoding error: %s", exc)
        return JsonResponse({"error": "Geocoding service unavailable"}, status=502)

    current_coord = {"lat": current_geo["lat"], "lng": current_geo["lng"]}
    pickup_coord = {"lat": pickup_geo["lat"], "lng": pickup_geo["lng"]}
    dropoff_coord = {"lat": dropoff_geo["lat"], "lng": dropoff_geo["lng"]}

    try:
        leg1 = get_osrm_route(current_coord, pickup_coord)
        leg2 = get_osrm_route(pickup_coord, dropoff_coord)
    except Exception as exc:
        logger.error("OSRM error: %s", exc)
        return JsonResponse({"error": "Routing service unavailable"}, status=502)

    route_coordinates = leg1["coordinates"] + leg2["coordinates"]

    profile = get_or_create_profile()
    summary, stops, eld_logs = calculate_trip(
        current_coord, pickup_coord, dropoff_coord,
        current_geo["name"] or current_location,
        pickup_geo["name"] or pickup_location,
        dropoff_geo["name"] or dropoff_location,
        leg1["distanceMiles"],
        leg2["distanceMiles"],
        current_cycle_used_hours,
        driver_name=profile.driver_name,
        carrier_name=profile.carrier_name,
        truck_number=profile.truck_number,
    )

    return JsonResponse({
        "summary": summary,
        "routeCoordinates": route_coordinates,
        "stops": stops,
        "eldLogs": eld_logs,
    })


@csrf_exempt
def profile_view(request):
    if request.method == "GET":
        profile = get_or_create_profile()
        return JsonResponse(_profile_to_dict(profile))

    if request.method == "PUT":
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        driver_name = body.get("driverName", "").strip()
        carrier_name = body.get("carrierName", "").strip()
        truck_number = body.get("truckNumber", "").strip()

        if not driver_name or not carrier_name or not truck_number:
            return JsonResponse({"error": "driverName, carrierName, and truckNumber are required"}, status=400)

        profile = get_or_create_profile()
        profile.driver_name = driver_name
        profile.carrier_name = carrier_name
        profile.truck_number = truck_number
        profile.license_number = body.get("licenseNumber", profile.license_number)
        profile.home_terminal = body.get("homeTerminal", profile.home_terminal)
        profile.save()
        return JsonResponse(_profile_to_dict(profile))

    return JsonResponse({"error": "Method not allowed"}, status=405)


@method_decorator(csrf_exempt, name="dispatch")
class SavedTripsView(View):
    def get(self, request):
        trips = list(SavedTrip.objects.values("id", "name", "created_at", "trip_input", "trip_plan").order_by("-created_at"))
        result = [
            {
                "id": t["id"],
                "name": t["name"],
                "createdAt": t["created_at"].isoformat(),
                "tripInput": t["trip_input"],
                "tripPlan": t["trip_plan"],
            }
            for t in trips
        ]
        return JsonResponse(result, safe=False)

    def post(self, request):
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        name = body.get("name", "").strip()
        trip_input = body.get("tripInput")
        trip_plan = body.get("tripPlan")

        if not name or trip_input is None or trip_plan is None:
            return JsonResponse({"error": "name, tripInput, and tripPlan are required"}, status=400)

        trip = SavedTrip.objects.create(name=name, trip_input=trip_input, trip_plan=trip_plan)
        return JsonResponse(
            {
                "id": trip.id,
                "name": trip.name,
                "createdAt": trip.created_at.isoformat(),
                "tripInput": trip.trip_input,
                "tripPlan": trip.trip_plan,
            },
            status=201,
        )


@method_decorator(csrf_exempt, name="dispatch")
class SavedTripDetailView(View):
    def get(self, request, trip_id):
        try:
            trip = SavedTrip.objects.get(pk=trip_id)
        except SavedTrip.DoesNotExist:
            return JsonResponse({"error": "Trip not found"}, status=404)
        return JsonResponse({
            "id": trip.id,
            "name": trip.name,
            "createdAt": trip.created_at.isoformat(),
            "tripInput": trip.trip_input,
            "tripPlan": trip.trip_plan,
        })

    def delete(self, request, trip_id):
        try:
            trip = SavedTrip.objects.get(pk=trip_id)
        except SavedTrip.DoesNotExist:
            return JsonResponse({"error": "Trip not found"}, status=404)
        trip.delete()
        from django.http import HttpResponse
        return HttpResponse(status=204)
