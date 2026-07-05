from django.urls import path

from . import views

urlpatterns = [
    path("convert/", views.convert, name="convert"),
    path("hilal-visibility/", views.hilal_visibility, name="hilal-visibility"),
    path("prayer-times/", views.prayer_times_view, name="prayer-times"),
    path("qibla/", views.qibla_view, name="qibla"),
    path("visibility-grid/", views.visibility_grid_view, name="visibility-grid"),
]
