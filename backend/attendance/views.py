from rest_framework import status, generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count, Q
from datetime import datetime, timedelta
import csv
from django.http import HttpResponse

from .models import Attendance, OfficeLocation, RegularizationRequest
from .serializers import (
    AttendanceSerializer, PunchInSerializer, PunchOutSerializer,
    OfficeLocationSerializer, AttendanceReportSerializer,
    RegularizationRequestSerializer, RegularizationApplySerializer,
    RegularizationReviewSerializer
)
from .utils import validate_location, validate_ip, get_client_ip
from accounts.views import IsAdminUser
from accounts.utils import notify_regularization_applied, notify_regularization_status


class PunchInView(APIView):
    def post(self, request):
        serializer = PunchInSerializer(data=request.data)
        if not serializer.is_valid():
            print(f"[DEBUG] Serializer errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        latitude = serializer.validated_data.get('latitude')
        longitude = serializer.validated_data.get('longitude')
        client_ip = get_client_ip(request)

        print(f"[DEBUG] Punch In Request:")
        print(f"  User: {request.user}")
        print(f"  Latitude: {latitude}")
        print(f"  Longitude: {longitude}")
        print(f"  Client IP: {client_ip}")

        # Validate location
        location_valid, location_msg = validate_location(latitude, longitude)
        print(f"  Location Valid: {location_valid}, Msg: {location_msg}")
        if not location_valid:
            return Response(
                {"error": location_msg},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate IP
        ip_valid, ip_msg = validate_ip(client_ip)
        print(f"  IP Valid: {ip_valid}, Msg: {ip_msg}")
        if not ip_valid:
            return Response(
                {"error": ip_msg},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if already punched in today
        today = timezone.now().date()
        existing = Attendance.objects.filter(
            user=request.user, date=today
        ).first()

        if existing and existing.punch_in:
            return Response(
                {"error": "Already punched in today"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if today is employee's weekly off day
        # Python weekday(): Monday=0, Sunday=6 (matches our model)
        current_weekday = today.weekday()
        is_off_day = (current_weekday == request.user.weekly_off)

        if existing:
            # Update existing record
            existing.punch_in = timezone.now()
            existing.punch_in_latitude = latitude
            existing.punch_in_longitude = longitude
            existing.punch_in_ip = client_ip
            existing.is_off_day = is_off_day
            existing.save()
            attendance = existing
        else:
            # Create new record
            attendance = Attendance.objects.create(
                user=request.user,
                date=today,
                punch_in=timezone.now(),
                punch_in_latitude=latitude,
                punch_in_longitude=longitude,
                punch_in_ip=client_ip,
                is_off_day=is_off_day
            )

        return Response({
            "message": "Punch in successful",
            "data": AttendanceSerializer(attendance).data
        }, status=status.HTTP_201_CREATED)


class PunchOutView(APIView):
    def post(self, request):
        serializer = PunchOutSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        latitude = serializer.validated_data.get('latitude')
        longitude = serializer.validated_data.get('longitude')
        client_ip = get_client_ip(request)

        # Validate location
        location_valid, location_msg = validate_location(latitude, longitude)
        if not location_valid:
            return Response(
                {"error": location_msg},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate IP
        ip_valid, ip_msg = validate_ip(client_ip)
        if not ip_valid:
            return Response(
                {"error": ip_msg},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if punched in today
        today = timezone.now().date()
        attendance = Attendance.objects.filter(
            user=request.user, date=today
        ).first()

        if not attendance or not attendance.punch_in:
            return Response(
                {"error": "You haven't punched in today"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if attendance.punch_out:
            return Response(
                {"error": "Already punched out today"},
                status=status.HTTP_400_BAD_REQUEST
            )

        attendance.punch_out = timezone.now()
        attendance.punch_out_latitude = latitude
        attendance.punch_out_longitude = longitude
        attendance.punch_out_ip = client_ip
        attendance.save()  # This will calculate working hours

        return Response({
            "message": "Punch out successful",
            "data": AttendanceSerializer(attendance).data
        })


class TodayAttendanceView(APIView):
    def get(self, request):
        today = timezone.now().date()
        attendance = Attendance.objects.filter(
            user=request.user, date=today
        ).first()

        if attendance:
            return Response(AttendanceSerializer(attendance).data)
        return Response({"message": "No attendance record for today"})


class MyAttendanceListView(generics.ListAPIView):
    serializer_class = AttendanceSerializer

    def get_queryset(self):
        queryset = Attendance.objects.filter(user=self.request.user)

        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')

        if start_date and end_date:
            queryset = queryset.filter(date__range=[start_date, end_date])
        elif month and year:
            queryset = queryset.filter(
                date__month=month, date__year=year
            )

        return queryset.order_by('-date')


# Admin views
class AllAttendanceListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AttendanceSerializer

    def get_queryset(self):
        queryset = Attendance.objects.all()

        user_id = self.request.query_params.get('user_id')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')

        if user_id:
            queryset = queryset.filter(user_id=user_id)
        if start_date and end_date:
            queryset = queryset.filter(date__range=[start_date, end_date])
        elif month and year:
            queryset = queryset.filter(date__month=month, date__year=year)

        return queryset.order_by('-date', 'user__name')


class AttendanceReportView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        month = request.query_params.get('month', timezone.now().month)
        year = request.query_params.get('year', timezone.now().year)

        from accounts.models import User
        employees = User.objects.filter(role='employee', is_active=True)

        report = []
        for emp in employees:
            attendance_data = Attendance.objects.filter(
                user=emp, date__month=month, date__year=year
            ).aggregate(
                total_present=Count('id', filter=Q(status='present')),
                total_absent=Count('id', filter=Q(status='absent')),
                total_half_day=Count('id', filter=Q(status='half_day')),
                total_on_leave=Count('id', filter=Q(status='on_leave')),
                total_working_hours=Sum('working_hours')
            )

            report.append({
                'user_id': emp.id,
                'user_name': emp.name,
                'total_present': attendance_data['total_present'] or 0,
                'total_absent': attendance_data['total_absent'] or 0,
                'total_half_day': attendance_data['total_half_day'] or 0,
                'total_on_leave': attendance_data['total_on_leave'] or 0,
                'total_working_hours': attendance_data['total_working_hours'] or 0
            })

        return Response(report)


class ExportAttendanceCSVView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        month = request.query_params.get('month', timezone.now().month)
        year = request.query_params.get('year', timezone.now().year)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="attendance_{year}_{month}.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'Employee Name', 'Date', 'Punch In', 'Punch Out',
            'Working Hours', 'Status'
        ])

        attendances = Attendance.objects.filter(
            date__month=month, date__year=year
        ).select_related('user').order_by('user__name', 'date')

        for att in attendances:
            writer.writerow([
                att.user.name,
                att.date,
                att.punch_in.strftime('%H:%M:%S') if att.punch_in else '',
                att.punch_out.strftime('%H:%M:%S') if att.punch_out else '',
                att.working_hours,
                att.status
            ])

        return response


class OfficeLocationListView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = OfficeLocationSerializer
    queryset = OfficeLocation.objects.all()


class OfficeLocationDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = OfficeLocationSerializer
    queryset = OfficeLocation.objects.all()


class OffDayWorkStatsView(APIView):
    """Get off-day work stats for the current user"""

    def get(self, request):
        month = request.query_params.get('month', timezone.now().month)
        year = request.query_params.get('year', timezone.now().year)

        # Get all off-day attendance records for this user
        off_day_records = Attendance.objects.filter(
            user=request.user,
            is_off_day=True,
            date__month=month,
            date__year=year
        ).order_by('-date')

        # Count total off-day work days
        total_off_day_work = off_day_records.count()

        # Calculate total hours worked on off days
        total_hours = off_day_records.aggregate(
            total=Sum('working_hours')
        )['total'] or 0

        # Get the list of dates worked on off days
        off_day_dates = list(off_day_records.values('date', 'working_hours'))

        return Response({
            'total_off_day_work': total_off_day_work,
            'total_hours_on_off_days': total_hours,
            'off_day_records': off_day_dates,
            'month': month,
            'year': year
        })


# Regularization Views
class RegularizationApplyView(APIView):
    """Employee applies for attendance regularization"""

    def post(self, request):
        serializer = RegularizationApplySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        date = serializer.validated_data['date']
        request_type = serializer.validated_data['request_type']
        requested_punch_in = serializer.validated_data.get('requested_punch_in')
        requested_punch_out = serializer.validated_data.get('requested_punch_out')
        reason = serializer.validated_data['reason']

        # Cannot apply regularization for today or future dates
        today = timezone.now().date()
        if date >= today:
            return Response(
                {"error": "Regularization can only be applied for past dates"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if request already exists for this date
        existing = RegularizationRequest.objects.filter(
            user=request.user,
            date=date,
            status='pending'
        ).first()

        if existing:
            return Response(
                {"error": "A pending regularization request already exists for this date"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get existing attendance record if any
        attendance = Attendance.objects.filter(
            user=request.user,
            date=date
        ).first()

        # Create regularization request
        regularization = RegularizationRequest.objects.create(
            user=request.user,
            attendance=attendance,
            date=date,
            request_type=request_type,
            requested_punch_in=requested_punch_in,
            requested_punch_out=requested_punch_out,
            reason=reason
        )

        # Notify admins about new regularization request
        notify_regularization_applied(regularization)

        return Response({
            "message": "Regularization request submitted successfully",
            "data": RegularizationRequestSerializer(regularization).data
        }, status=status.HTTP_201_CREATED)


class MyRegularizationListView(generics.ListAPIView):
    """Employee views their own regularization requests"""
    serializer_class = RegularizationRequestSerializer

    def get_queryset(self):
        return RegularizationRequest.objects.filter(user=self.request.user)


class AllRegularizationListView(generics.ListAPIView):
    """Admin views all regularization requests"""
    permission_classes = [IsAdminUser]
    serializer_class = RegularizationRequestSerializer

    def get_queryset(self):
        queryset = RegularizationRequest.objects.all()

        status_filter = self.request.query_params.get('status')
        user_id = self.request.query_params.get('user_id')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        return queryset


class RegularizationReviewView(APIView):
    """Admin reviews (approves/rejects) a regularization request"""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            regularization = RegularizationRequest.objects.get(pk=pk)
        except RegularizationRequest.DoesNotExist:
            return Response(
                {"error": "Regularization request not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        if regularization.status != 'pending':
            return Response(
                {"error": "This request has already been reviewed"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = RegularizationReviewSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        new_status = serializer.validated_data['status']
        review_remarks = serializer.validated_data.get('review_remarks', '')

        regularization.status = new_status
        regularization.reviewed_by = request.user
        regularization.reviewed_on = timezone.now()
        regularization.review_remarks = review_remarks
        regularization.save()

        # If approved, update the attendance record
        if new_status == 'approved':
            attendance, created = Attendance.objects.get_or_create(
                user=regularization.user,
                date=regularization.date,
                defaults={'status': 'present'}
            )

            # Update attendance based on request type
            if regularization.requested_punch_in:
                punch_in_datetime = timezone.make_aware(
                    datetime.combine(regularization.date, regularization.requested_punch_in)
                )
                attendance.punch_in = punch_in_datetime

            if regularization.requested_punch_out:
                punch_out_datetime = timezone.make_aware(
                    datetime.combine(regularization.date, regularization.requested_punch_out)
                )
                attendance.punch_out = punch_out_datetime

            # Always set status to present when regularization is approved
            attendance.status = 'present'
            attendance.notes = f"Regularized: {regularization.request_type}"
            attendance.save()

        # Notify employee about regularization status (with email)
        notify_regularization_status(regularization, new_status, review_remarks)

        return Response({
            "message": f"Regularization request {new_status}",
            "data": RegularizationRequestSerializer(regularization).data
        })


class CancelRegularizationView(APIView):
    """Employee cancels their own pending regularization request"""

    def post(self, request, pk):
        try:
            regularization = RegularizationRequest.objects.get(
                pk=pk,
                user=request.user
            )
        except RegularizationRequest.DoesNotExist:
            return Response(
                {"error": "Regularization request not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        if regularization.status != 'pending':
            return Response(
                {"error": "Only pending requests can be cancelled"},
                status=status.HTTP_400_BAD_REQUEST
            )

        regularization.delete()

        return Response({"message": "Regularization request cancelled"})
