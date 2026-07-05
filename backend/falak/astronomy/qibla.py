"""Qibla direction: great-circle initial bearing and distance to the Kaaba."""
from __future__ import annotations

import math
from dataclasses import dataclass

KAABA_LATITUDE_DEG = 21.4225
KAABA_LONGITUDE_DEG = 39.8262

EARTH_MEAN_RADIUS_KM = 6371.0088


@dataclass(frozen=True)
class QiblaResult:
    bearing_deg: float  # clockwise from true north, 0-360
    distance_km: float


def qibla_direction(lat_deg: float, lon_deg: float) -> QiblaResult:
    """
    Initial great-circle bearing from (lat_deg, lon_deg) to the Kaaba, and
    the great-circle distance, via the standard spherical bearing/haversine
    formulas.
    """
    lat1 = math.radians(lat_deg)
    lat2 = math.radians(KAABA_LATITUDE_DEG)
    delta_lon = math.radians(KAABA_LONGITUDE_DEG - lon_deg)

    y = math.sin(delta_lon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(delta_lon)
    bearing = (math.degrees(math.atan2(y, x))) % 360.0

    a = (
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
    )
    central_angle = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = EARTH_MEAN_RADIUS_KM * central_angle

    return QiblaResult(bearing_deg=bearing, distance_km=distance)
