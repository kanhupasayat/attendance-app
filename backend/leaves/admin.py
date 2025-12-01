from django.contrib import admin
from .models import LeaveType, LeaveBalance, LeaveRequest, Holiday


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'annual_quota', 'is_carry_forward', 'max_carry_forward', 'is_active']
    list_filter = ['is_active', 'is_carry_forward']
    search_fields = ['name', 'code']


@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = ['user', 'leave_type', 'year', 'total_leaves', 'used_leaves', 'available_leaves', 'lop_days']
    list_filter = ['year', 'leave_type']
    search_fields = ['user__name', 'user__mobile']


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ['user', 'leave_type', 'start_date', 'end_date', 'total_days', 'status', 'is_lop']
    list_filter = ['status', 'leave_type', 'is_lop', 'applied_on']
    search_fields = ['user__name', 'user__mobile']
    date_hierarchy = 'applied_on'


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ['name', 'date', 'is_optional']
    list_filter = ['is_optional', 'date']
    search_fields = ['name']
    date_hierarchy = 'date'
