from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, OTP


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['mobile', 'name', 'email', 'role', 'is_active', 'is_admin']
    list_filter = ['role', 'is_active', 'is_admin', 'date_joined']
    search_fields = ['mobile', 'name', 'email']
    ordering = ['-date_joined']

    fieldsets = (
        (None, {'fields': ('mobile', 'password')}),
        ('Personal Info', {'fields': ('name', 'email', 'department', 'designation')}),
        ('Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_admin', 'is_superuser')}),
        ('Important dates', {'fields': ('date_joined', 'last_login')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('mobile', 'name', 'password1', 'password2', 'role'),
        }),
    )


@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ['user', 'otp', 'created_at', 'expires_at', 'is_used']
    list_filter = ['is_used', 'created_at']
    search_fields = ['user__mobile', 'user__name']
