from django.contrib import admin

from .models import ConjunctionEvent, IsbatRecord, Location, PrayerTimeConvention, VisibilityResult

admin.site.register(Location)
admin.site.register(ConjunctionEvent)
admin.site.register(PrayerTimeConvention)
admin.site.register(VisibilityResult)
admin.site.register(IsbatRecord)
