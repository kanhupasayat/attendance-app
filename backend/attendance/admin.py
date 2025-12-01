from django.contrib import admin
from .models import Attendance, OfficeLocation


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'punch_in', 'punch_out', 'working_hours', 'status']
    list_filter = ['status', 'date']
    search_fields = ['user__name', 'user__mobile']
    date_hierarchy = 'date'
    ordering = ['-date', '-punch_in']


@admin.register(OfficeLocation)
class OfficeLocationAdmin(admin.ModelAdmin):
    list_display = ['name', 'latitude', 'longitude', 'radius_meters', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']
