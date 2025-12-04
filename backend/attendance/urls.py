from django.urls import path
from .views import (
    PunchInView, PunchOutView, TodayAttendanceView, MyAttendanceListView,
    AllAttendanceListView, AttendanceReportView, ExportAttendanceCSVView,
    OfficeLocationListView, OfficeLocationDetailView, OffDayWorkStatsView,
    RegularizationApplyView, MyRegularizationListView, AllRegularizationListView,
    RegularizationReviewView, CancelRegularizationView,
    WFHApplyView, MyWFHListView, AllWFHListView, WFHReviewView,
    CancelWFHView, TodayWFHStatusView, AutoPunchOutView,
    AdminAttendanceCreateView, AdminAttendanceUpdateView,
    AdminMarkAbsentView, AdminBulkAttendanceView, AdminClearPunchOutView,
    ShiftListCreateView, ShiftDetailView, AssignShiftView,
    MyCompOffListView, AllCompOffListView, CompOffBalanceView,
    UseCompOffView, AdminCreateCompOffView, UseCompOffToReduceLOPView
)

urlpatterns = [
    # Employee endpoints
    path('punch-in/', PunchInView.as_view(), name='punch-in'),
    path('punch-out/', PunchOutView.as_view(), name='punch-out'),
    path('today/', TodayAttendanceView.as_view(), name='today-attendance'),
    path('my-attendance/', MyAttendanceListView.as_view(), name='my-attendance'),
    path('off-day-stats/', OffDayWorkStatsView.as_view(), name='off-day-stats'),

    # Regularization
    path('regularization/apply/', RegularizationApplyView.as_view(), name='regularization-apply'),
    path('regularization/my-requests/', MyRegularizationListView.as_view(), name='my-regularizations'),
    path('regularization/cancel/<int:pk>/', CancelRegularizationView.as_view(), name='cancel-regularization'),

    # Admin endpoints
    path('all/', AllAttendanceListView.as_view(), name='all-attendance'),
    path('report/', AttendanceReportView.as_view(), name='attendance-report'),
    path('export/', ExportAttendanceCSVView.as_view(), name='export-attendance'),
    path('regularization/all/', AllRegularizationListView.as_view(), name='all-regularizations'),
    path('regularization/review/<int:pk>/', RegularizationReviewView.as_view(), name='review-regularization'),

    # Office locations
    path('locations/', OfficeLocationListView.as_view(), name='office-locations'),
    path('locations/<int:pk>/', OfficeLocationDetailView.as_view(), name='office-location-detail'),

    # WFH (Work From Home)
    path('wfh/apply/', WFHApplyView.as_view(), name='wfh-apply'),
    path('wfh/my-requests/', MyWFHListView.as_view(), name='my-wfh'),
    path('wfh/today-status/', TodayWFHStatusView.as_view(), name='today-wfh-status'),
    path('wfh/cancel/<int:pk>/', CancelWFHView.as_view(), name='cancel-wfh'),
    path('wfh/all/', AllWFHListView.as_view(), name='all-wfh'),
    path('wfh/review/<int:pk>/', WFHReviewView.as_view(), name='review-wfh'),

    # Cron job endpoint (for external cron services like cron-job.org)
    path('cron/auto-punch-out/', AutoPunchOutView.as_view(), name='auto-punch-out'),

    # Admin attendance management
    path('admin/add/', AdminAttendanceCreateView.as_view(), name='admin-attendance-add'),
    path('admin/update/<int:pk>/', AdminAttendanceUpdateView.as_view(), name='admin-attendance-update'),
    path('admin/mark-absent/', AdminMarkAbsentView.as_view(), name='admin-mark-absent'),
    path('admin/bulk-update/', AdminBulkAttendanceView.as_view(), name='admin-bulk-attendance'),
    path('admin/clear-punch-out/<int:pk>/', AdminClearPunchOutView.as_view(), name='admin-clear-punch-out'),

    # Shift management (Admin)
    path('shifts/', ShiftListCreateView.as_view(), name='shift-list-create'),
    path('shifts/<int:pk>/', ShiftDetailView.as_view(), name='shift-detail'),
    path('shifts/assign/', AssignShiftView.as_view(), name='assign-shift'),

    # Comp Off
    path('comp-off/my/', MyCompOffListView.as_view(), name='my-comp-off'),
    path('comp-off/all/', AllCompOffListView.as_view(), name='all-comp-off'),
    path('comp-off/balance/', CompOffBalanceView.as_view(), name='comp-off-balance'),
    path('comp-off/use/', UseCompOffView.as_view(), name='use-comp-off'),
    path('comp-off/admin/create/', AdminCreateCompOffView.as_view(), name='admin-create-comp-off'),
    path('comp-off/reduce-lop/', UseCompOffToReduceLOPView.as_view(), name='comp-off-reduce-lop'),
]
