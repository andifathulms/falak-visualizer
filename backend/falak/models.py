"""
Persistence models (PRD Sec. 5 / CLAUDE.md Phase 1.1). These cache the
outputs of the deterministic astronomy engine (astronomy/*.py) - they are
never a source of truth for a calculation themselves, only a cache in front
of one, so a cache miss/invalidation always falls back to recomputing from
first principles rather than a stale or placeholder value.
"""
from django.db import models


class Location(models.Model):
    name = models.CharField(max_length=255)
    latitude_deg = models.FloatField()
    longitude_deg = models.FloatField()
    timezone = models.CharField(max_length=64, help_text="IANA timezone name, e.g. Asia/Jakarta")

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.latitude_deg}, {self.longitude_deg})"


class ConjunctionEvent(models.Model):
    """Cached ijtimak calculation for a given lunation."""

    hijri_year = models.IntegerField()
    hijri_month = models.IntegerField()
    conjunction_time_utc = models.DateTimeField()
    computed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("hijri_year", "hijri_month")
        ordering = ["hijri_year", "hijri_month"]

    def __str__(self) -> str:
        return f"Conjunction for {self.hijri_year}-{self.hijri_month:02d}: {self.conjunction_time_utc}"


class PrayerTimeConvention(models.Model):
    """Angle presets (Kemenag RI, MWL, ISNA, ...); Kemenag RI only in MVP."""

    name = models.CharField(max_length=64, unique=True)
    fajr_angle_deg = models.FloatField()
    isha_angle_deg = models.FloatField()
    asr_shadow_factor = models.FloatField(default=1.0)
    dhuhr_correction_minutes = models.FloatField(default=2.0)
    is_default = models.BooleanField(default=False)

    def __str__(self) -> str:
        return self.name


class VisibilityResult(models.Model):
    """Cached per-location/date/method hilal visibility computation."""

    class Method(models.TextChoices):
        WUJUDUL_HILAL = "wujudul_hilal", "Wujudul Hilal"
        MABIMS_2021 = "mabims_2021", "MABIMS 2021 (Imkanur Rukyat)"
        ODEH = "odeh", "Odeh Criterion"

    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name="visibility_results")
    date = models.DateField()
    method = models.CharField(max_length=32, choices=Method.choices)

    moon_altitude_deg = models.FloatField()
    sun_altitude_deg = models.FloatField()
    elongation_deg = models.FloatField()
    moon_age_hours = models.FloatField()
    illumination_fraction = models.FloatField()
    lag_time_minutes = models.FloatField(null=True)
    verdict = models.CharField(max_length=32, help_text="e.g. 'visible', 'not_visible', or boolean-as-string")

    computed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("location", "date", "method")
        ordering = ["-date"]

    def __str__(self) -> str:
        return f"{self.location.name} {self.date} [{self.method}] -> {self.verdict}"


class IsbatRecord(models.Model):
    """A real, historically-announced Kemenag sidang isbat month-start date -
    reference data for checking what each hisab method would have predicted
    against what was actually announced. Must be sourced from an actual,
    citable Kemenag announcement (source_note); never estimated or
    back-computed from this app's own engine, which would be circular.
    `verified` stays False until a maintainer has confirmed the date against
    a primary source - see falak/migrations/0003_seed_isbat_records.py.
    """

    hijri_year = models.IntegerField()
    hijri_month = models.IntegerField()
    gregorian_start_date = models.DateField(help_text="Actual Kemenag-announced first day of the Hijri month.")
    source_note = models.TextField(help_text="Citation for this date, e.g. Kemenag press release URL/date.")
    verified = models.BooleanField(
        default=False,
        help_text="False until a maintainer has confirmed gregorian_start_date against a primary Kemenag source.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("hijri_year", "hijri_month")
        ordering = ["-hijri_year", "-hijri_month"]

    def __str__(self) -> str:
        return f"{self.hijri_year}-{self.hijri_month:02d} isbat: {self.gregorian_start_date} (verified={self.verified})"
