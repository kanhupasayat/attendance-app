from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    AdminSignupView, LoginView, OTPRequestView, OTPVerifyView,
    ProfileView, ChangePasswordView, EmployeeListView, EmployeeDetailView,
    CheckAdminExistsView, AdminDashboardStatsView,
    NotificationListView, UnreadNotificationCountView, MarkNotificationReadView,
    MarkAllNotificationsReadView, ClearNotificationsView,
    # Profile Update Request Views
    ProfileUpdateRequestView, MyProfileUpdateRequestsView, CancelProfileUpdateRequestView,
    AllProfileUpdateRequestsView, ReviewProfileUpdateRequestView
)

urlpatterns = [
    # Auth
    path('check-admin/', CheckAdminExistsView.as_view(), name='check-admin'),
    path('admin-signup/', AdminSignupView.as_view(), name='admin-signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    # OTP
    path('otp/request/', OTPRequestView.as_view(), name='otp-request'),
    path('otp/verify/', OTPVerifyView.as_view(), name='otp-verify'),

    # Profile
    path('profile/', ProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),

    # Profile Update Requests (Employee)
    path('profile/update-request/', ProfileUpdateRequestView.as_view(), name='profile-update-request'),
    path('profile/my-requests/', MyProfileUpdateRequestsView.as_view(), name='my-profile-requests'),
    path('profile/cancel-request/<int:pk>/', CancelProfileUpdateRequestView.as_view(), name='cancel-profile-request'),

    # Profile Update Requests (Admin)
    path('profile/all-requests/', AllProfileUpdateRequestsView.as_view(), name='all-profile-requests'),
    path('profile/review/<int:pk>/', ReviewProfileUpdateRequestView.as_view(), name='review-profile-request'),

    # Admin - Employee Management
    path('employees/', EmployeeListView.as_view(), name='employee-list'),
    path('employees/<int:pk>/', EmployeeDetailView.as_view(), name='employee-detail'),

    # Admin - Dashboard Stats
    path('dashboard-stats/', AdminDashboardStatsView.as_view(), name='dashboard-stats'),

    # Notifications
    path('notifications/', NotificationListView.as_view(), name='notifications'),
    path('notifications/unread-count/', UnreadNotificationCountView.as_view(), name='notification-unread-count'),
    path('notifications/read/<int:pk>/', MarkNotificationReadView.as_view(), name='notification-read'),
    path('notifications/read-all/', MarkAllNotificationsReadView.as_view(), name='notifications-read-all'),
    path('notifications/clear/', ClearNotificationsView.as_view(), name='notifications-clear'),
]
