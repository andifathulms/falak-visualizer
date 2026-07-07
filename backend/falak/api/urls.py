from django.urls import path

from . import views

urlpatterns = [
    path("convert/", views.convert, name="convert"),
    path("hilal-visibility/", views.hilal_visibility, name="hilal-visibility"),
    path("prayer-times/", views.prayer_times_view, name="prayer-times"),
    path("prayer-times-month/", views.prayer_times_month_view, name="prayer-times-month"),
    path("qibla/", views.qibla_view, name="qibla"),
    path("visibility-grid/", views.visibility_grid_view, name="visibility-grid"),
    path("method-divergence/", views.method_divergence, name="method-divergence"),
    path("visibility-calendar/", views.visibility_calendar, name="visibility-calendar"),
    path("isbat-accuracy/", views.isbat_accuracy_view, name="isbat-accuracy"),
    path("rashdul-qibla/", views.rashdul_qibla_view, name="rashdul-qibla"),
]
