from django.contrib import admin

from .models import ConjunctionEvent, Location, PrayerTimeConvention, VisibilityResult

admin.site.register(Location)
admin.site.register(ConjunctionEvent)
admin.site.register(PrayerTimeConvention)
admin.site.register(VisibilityResult)
