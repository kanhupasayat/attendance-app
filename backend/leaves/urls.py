from django.urls import path
from .views import (
    LeaveTypeListView, LeaveTypeDetailView, MyLeaveBalanceView,
    LeaveApplyView, MyLeaveRequestsView, CancelLeaveRequestView,
    AllLeaveRequestsView, ReviewLeaveRequestView, AllLeaveBalancesView,
    InitializeLeaveBalanceView, MonthlyCreditView, NewYearResetView,
    UpdateLeaveBalanceView, UpdateLeaveRequestView, ExportLeaveReportCSVView,
    HolidayListView, HolidayDetailView, CheckTodayLeaveView, CancelLeaveForDateView,
    ProcessMonthEndView
)

urlpatterns = [
    # Leave Types
    path('types/', LeaveTypeListView.as_view(), name='leave-types'),
    path('types/<int:pk>/', LeaveTypeDetailView.as_view(), name='leave-type-detail'),

    # Employee endpoints
    path('my-balance/', MyLeaveBalanceView.as_view(), name='my-leave-balance'),
    path('apply/', LeaveApplyView.as_view(), name='leave-apply'),
    path('my-requests/', MyLeaveRequestsView.as_view(), name='my-leave-requests'),
    path('cancel/<int:pk>/', CancelLeaveRequestView.as_view(), name='cancel-leave'),

    # Admin endpoints
    path('all-requests/', AllLeaveRequestsView.as_view(), name='all-leave-requests'),
    path('review/<int:pk>/', ReviewLeaveRequestView.as_view(), name='review-leave'),
    path('update-request/<int:pk>/', UpdateLeaveRequestView.as_view(), name='update-leave-request'),
    path('all-balances/', AllLeaveBalancesView.as_view(), name='all-leave-balances'),
    path('update-balance/<int:pk>/', UpdateLeaveBalanceView.as_view(), name='update-leave-balance'),
    path('initialize/', InitializeLeaveBalanceView.as_view(), name='initialize-balances'),
    path('monthly-credit/', MonthlyCreditView.as_view(), name='monthly-credit'),
    path('new-year-reset/', NewYearResetView.as_view(), name='new-year-reset'),
    path('export/', ExportLeaveReportCSVView.as_view(), name='export-leave-report'),

    # Holidays
    path('holidays/', HolidayListView.as_view(), name='holidays'),
    path('holidays/<int:pk>/', HolidayDetailView.as_view(), name='holiday-detail'),

    # Leave-Punch conflict handling
    path('check-today-leave/', CheckTodayLeaveView.as_view(), name='check-today-leave'),
    path('cancel-leave-for-date/', CancelLeaveForDateView.as_view(), name='cancel-leave-for-date'),

    # Cron endpoints
    path('process-month-end/', ProcessMonthEndView.as_view(), name='process-month-end'),
]
