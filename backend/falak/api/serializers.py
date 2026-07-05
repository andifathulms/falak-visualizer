"""
Output serializers. Every serializer here exposes the raw inputs that
produced a verdict alongside the verdict itself (CLAUDE.md: "every verdict
must be inspectable") - never just a bare boolean/string.
"""
from rest_framework import serializers


class HilalObservationSerializer(serializers.Serializer):
    date = serializers.DateField()
    latitude_deg = serializers.FloatField()
    longitude_deg = serializers.FloatField()
    conjunction_time_utc = serializers.DateTimeField(source="conjunction_time")
    sunset_time_utc = serializers.DateTimeField(source="sunset_time")
    moonset_time_utc = serializers.DateTimeField(source="moonset_time", allow_null=True)
    moon_altitude_deg = serializers.FloatField()
    sun_altitude_deg = serializers.FloatField()
    elongation_deg = serializers.FloatField()
    moon_age_hours = serializers.FloatField()
    illumination_fraction = serializers.FloatField()
    lag_time_minutes = serializers.FloatField(allow_null=True)
    crescent_width_arcmin = serializers.FloatField()


class PrayerTimesSerializer(serializers.Serializer):
    date = serializers.DateField()
    latitude_deg = serializers.FloatField()
    longitude_deg = serializers.FloatField()
    convention = serializers.CharField()
    fajr = serializers.DateTimeField(allow_null=True)
    sunrise = serializers.DateTimeField(allow_null=True)
    dhuhr = serializers.DateTimeField()
    asr = serializers.DateTimeField(allow_null=True)
    maghrib = serializers.DateTimeField(allow_null=True)
    isha = serializers.DateTimeField(allow_null=True)


class QiblaSerializer(serializers.Serializer):
    latitude_deg = serializers.FloatField()
    longitude_deg = serializers.FloatField()
    bearing_deg = serializers.FloatField()
    distance_km = serializers.FloatField()
