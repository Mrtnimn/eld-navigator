from django.db import models


class SavedTrip(models.Model):
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    trip_input = models.JSONField()
    trip_plan = models.JSONField()

    class Meta:
        db_table = "saved_trips"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class DriverProfile(models.Model):
    driver_name = models.CharField(max_length=255, default="Driver Name")
    carrier_name = models.CharField(max_length=255, default="Carrier Co.")
    truck_number = models.CharField(max_length=100, default="TRK-001")
    license_number = models.CharField(max_length=100, blank=True, default="")
    home_terminal = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        db_table = "driver_profile"

    def __str__(self):
        return self.driver_name
