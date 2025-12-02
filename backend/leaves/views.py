from rest_framework import status, generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum
import csv
from django.http import HttpResponse

from .models import LeaveType, LeaveBalance, LeaveRequest, Holiday
from .serializers import (
    LeaveTypeSerializer, LeaveBalanceSerializer, LeaveRequestSerializer,
    LeaveApplySerializer, LeaveReviewSerializer, HolidaySerializer
)
from accounts.views import IsAdminUser
from accounts.utils import notify_leave_applied, notify_leave_status


class LeaveTypeListView(generics.ListCreateAPIView):
    serializer_class = LeaveTypeSerializer
    queryset = LeaveType.objects.filter(is_active=True)

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]


class LeaveTypeDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = LeaveTypeSerializer
    queryset = LeaveType.objects.all()


class MyLeaveBalanceView(APIView):
    def get(self, request):
        year = int(request.query_params.get('year', timezone.now().year))
        month = int(request.query_params.get('month', timezone.now().month))

        # Get or create balance for current month
        leave_types = LeaveType.objects.filter(is_active=True)
        balances = []

        for lt in leave_types:
            # Set monthly quota based on leave type
            # Sick Leave (SL) = 1 per month
            # Others = 5 per month (or use annual_quota / 12)
            if lt.code == 'SL':
                monthly_quota = 1
            elif lt.code == 'LOP':
                monthly_quota = 0
            else:
                monthly_quota = 5

            balance, created = LeaveBalance.objects.get_or_create(
                user=request.user,
                leave_type=lt,
                year=year,
                month=month,
                defaults={
                    'total_leaves': monthly_quota,
                    'used_leaves': 0,
                    'carried_forward': 0,
                    'lop_days': 0
                }
            )

            # If new month balance created, calculate carry forward from previous month
            if created and month > 1:
                prev_balance = LeaveBalance.objects.filter(
                    user=request.user,
                    leave_type=lt,
                    year=year,
                    month=month - 1
                ).first()
                if prev_balance:
                    unused = float(prev_balance.total_leaves) + float(prev_balance.carried_forward) - float(prev_balance.used_leaves)
                    balance.carried_forward = max(0, unused)
                    balance.save()
            elif created and month == 1:
                # January - check December of previous year
                prev_balance = LeaveBalance.objects.filter(
                    user=request.user,
                    leave_type=lt,
                    year=year - 1,
                    month=12
                ).first()
                if prev_balance:
                    unused = float(prev_balance.total_leaves) + float(prev_balance.carried_forward) - float(prev_balance.used_leaves)
                    balance.carried_forward = max(0, unused)
                    balance.save()

            balances.append(balance)

        return Response(LeaveBalanceSerializer(balances, many=True).data)


class LeaveApplyView(APIView):
    """
    Smart Leave System:
    1. First use available Comp Off
    2. Then use available Leave balance (minus pending requests)
    3. Remaining days become LOP
    """
    def post(self, request):
        from attendance.models import CompOff
        from django.db.models import Sum

        serializer = LeaveApplySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        leave_type = serializer.validated_data['leave_type']
        start_date = serializer.validated_data['start_date']
        end_date = serializer.validated_data['end_date']
        is_half_day = serializer.validated_data.get('is_half_day', False)

        # Calculate total days
        if is_half_day:
            total_days = 0.5
        else:
            total_days = (end_date - start_date).days + 1

        remaining_days = total_days

        # Step 1: Check available Comp Offs (earned, not expired)
        # Also check comp offs not already reserved in pending requests
        pending_comp_off_days = LeaveRequest.objects.filter(
            user=request.user,
            status='pending'
        ).aggregate(total=Sum('comp_off_days'))['total'] or 0

        available_comp_offs = CompOff.objects.filter(
            user=request.user,
            status='earned',
            expires_on__gte=start_date  # Not expired
        ).order_by('expires_on')  # Use earliest expiring first

        total_comp_off_available = sum(float(co.credit_days) for co in available_comp_offs)
        # Subtract already pending comp off days
        total_comp_off_available = max(0, total_comp_off_available - float(pending_comp_off_days))

        comp_off_days = min(remaining_days, total_comp_off_available)
        remaining_days -= comp_off_days

        # Step 2: Check leave balance for the month
        year = start_date.year
        month = start_date.month

        # Set monthly quota based on leave type
        if leave_type.code == 'SL':
            monthly_quota = 1
        elif leave_type.code == 'LOP':
            monthly_quota = 0
        else:
            monthly_quota = 5

        # Get or create balance for this month
        balance, created = LeaveBalance.objects.get_or_create(
            user=request.user,
            leave_type=leave_type,
            year=year,
            month=month,
            defaults={
                'total_leaves': monthly_quota,
                'used_leaves': 0,
                'carried_forward': 0,
                'lop_days': 0
            }
        )

        # If new balance created, calculate carry forward from previous month
        if created:
            if month > 1:
                prev_balance = LeaveBalance.objects.filter(
                    user=request.user,
                    leave_type=leave_type,
                    year=year,
                    month=month - 1
                ).first()
            else:
                prev_balance = LeaveBalance.objects.filter(
                    user=request.user,
                    leave_type=leave_type,
                    year=year - 1,
                    month=12
                ).first()

            if prev_balance:
                unused = float(prev_balance.total_leaves) + float(prev_balance.carried_forward) - float(prev_balance.used_leaves)
                balance.carried_forward = max(0, unused)
                balance.save()

        # Calculate already used/pending leaves for this leave type in this month
        # Include both pending AND approved requests
        already_used_paid_days = LeaveRequest.objects.filter(
            user=request.user,
            leave_type=leave_type,
            status__in=['pending', 'approved'],
            start_date__year=year,
            start_date__month=month
        ).aggregate(total=Sum('paid_days'))['total'] or 0

        # Calculate paid days from leave balance
        # available_leaves from balance already subtracts used_leaves
        # But we need to also subtract pending requests that haven't updated balance yet
        total_quota = float(balance.total_leaves) + float(balance.carried_forward)
        available_leaves = total_quota - float(already_used_paid_days)
        available_leaves = max(0, available_leaves)
        paid_days = min(remaining_days, available_leaves)
        remaining_days -= paid_days

        # Step 3: Remaining days become LOP
        lop_days = remaining_days
        is_lop = lop_days > 0

        # Check for overlapping leave requests
        overlapping = LeaveRequest.objects.filter(
            user=request.user,
            status__in=['pending', 'approved'],
            start_date__lte=end_date,
            end_date__gte=start_date
        ).exists()

        if overlapping:
            return Response(
                {"error": "You have overlapping leave requests"},
                status=status.HTTP_400_BAD_REQUEST
            )

        leave_request = LeaveRequest.objects.create(
            user=request.user,
            leave_type=leave_type,
            start_date=start_date,
            end_date=end_date,
            is_half_day=is_half_day,
            half_day_type=serializer.validated_data.get('half_day_type', ''),
            reason=serializer.validated_data['reason'],
            comp_off_days=comp_off_days,
            paid_days=paid_days,
            lop_days=lop_days,
            is_lop=is_lop
        )

        # Notify admins about new leave request
        notify_leave_applied(leave_request)

        return Response({
            "message": "Leave request submitted",
            "breakdown": {
                "total_days": total_days,
                "comp_off_days": comp_off_days,
                "paid_days": paid_days,
                "lop_days": lop_days
            },
            "data": LeaveRequestSerializer(leave_request).data
        }, status=status.HTTP_201_CREATED)


class MyLeaveRequestsView(generics.ListAPIView):
    serializer_class = LeaveRequestSerializer

    def get_queryset(self):
        return LeaveRequest.objects.filter(
            user=self.request.user
        ).select_related('leave_type', 'reviewed_by')


class CancelLeaveRequestView(APIView):
    def post(self, request, pk):
        try:
            leave_request = LeaveRequest.objects.get(
                pk=pk, user=request.user
            )
        except LeaveRequest.DoesNotExist:
            return Response(
                {"error": "Leave request not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        if leave_request.status != 'pending':
            return Response(
                {"error": "Can only cancel pending requests"},
                status=status.HTTP_400_BAD_REQUEST
            )

        leave_request.status = 'cancelled'
        leave_request.save()

        return Response({"message": "Leave request cancelled"})


# Admin views
class AllLeaveRequestsView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = LeaveRequestSerializer

    def get_queryset(self):
        queryset = LeaveRequest.objects.all().select_related(
            'user', 'leave_type', 'reviewed_by'
        )

        status_filter = self.request.query_params.get('status')
        user_id = self.request.query_params.get('user_id')

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        return queryset


class ReviewLeaveRequestView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            leave_request = LeaveRequest.objects.get(pk=pk)
        except LeaveRequest.DoesNotExist:
            return Response(
                {"error": "Leave request not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        if leave_request.status != 'pending':
            return Response(
                {"error": "This request has already been reviewed"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = LeaveReviewSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        new_status = serializer.validated_data['status']
        remarks = serializer.validated_data.get('remarks', '')

        leave_request.status = new_status
        leave_request.reviewed_by = request.user
        leave_request.reviewed_on = timezone.now()
        leave_request.review_remarks = remarks
        leave_request.save()

        # If approved, update leave balance and comp offs
        if new_status == 'approved':
            from attendance.models import Attendance, CompOff

            # Step 1: Deduct Comp Off days if used
            if leave_request.comp_off_days > 0:
                comp_off_to_use = float(leave_request.comp_off_days)
                available_comp_offs = CompOff.objects.filter(
                    user=leave_request.user,
                    status='earned',
                    expires_on__gte=leave_request.start_date
                ).order_by('expires_on')

                for comp_off in available_comp_offs:
                    if comp_off_to_use <= 0:
                        break
                    credit = float(comp_off.credit_days)
                    if credit <= comp_off_to_use:
                        # Use entire comp off
                        comp_off.status = 'used'
                        comp_off.used_date = leave_request.start_date
                        comp_off.save()
                        comp_off_to_use -= credit
                    else:
                        # Partial use - reduce credit days
                        comp_off.credit_days = credit - comp_off_to_use
                        comp_off.save()
                        comp_off_to_use = 0

            # Step 2: Update leave balance
            year = leave_request.start_date.year
            month = leave_request.start_date.month

            balance, created = LeaveBalance.objects.get_or_create(
                user=leave_request.user,
                leave_type=leave_request.leave_type,
                year=year,
                month=month,
                defaults={
                    'total_leaves': 5,
                    'used_leaves': 0,
                    'carried_forward': 0,
                    'lop_days': 0
                }
            )

            # Update used leaves and LOP
            balance.used_leaves += leave_request.paid_days
            balance.lop_days += leave_request.lop_days
            balance.save()

            # Step 3: Mark attendance as on_leave for approved dates
            current_date = leave_request.start_date
            while current_date <= leave_request.end_date:
                Attendance.objects.update_or_create(
                    user=leave_request.user,
                    date=current_date,
                    defaults={'status': 'on_leave'}
                )
                current_date += timezone.timedelta(days=1)

        # Notify employee about leave status (with email)
        notify_leave_status(leave_request, new_status, remarks)

        return Response({
            "message": f"Leave request {new_status}",
            "data": LeaveRequestSerializer(leave_request).data
        })


class AllLeaveBalancesView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = LeaveBalanceSerializer

    def get_queryset(self):
        year = int(self.request.query_params.get('year', timezone.now().year))
        month = int(self.request.query_params.get('month', timezone.now().month))
        return LeaveBalance.objects.filter(year=year, month=month).select_related(
            'user', 'leave_type'
        )


class InitializeLeaveBalanceView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        """Initialize leave balances for all employees for a given month"""
        year = int(request.data.get('year', timezone.now().year))
        month = int(request.data.get('month', timezone.now().month))

        from accounts.models import User
        employees = User.objects.filter(role='employee', is_active=True)
        leave_types = LeaveType.objects.filter(is_active=True)

        created_count = 0
        for emp in employees:
            for lt in leave_types:
                balance, created = LeaveBalance.objects.get_or_create(
                    user=emp,
                    leave_type=lt,
                    year=year,
                    month=month,
                    defaults={
                        'total_leaves': 5,
                        'used_leaves': 0,
                        'carried_forward': 0,
                        'lop_days': 0
                    }
                )

                # Calculate carry forward from previous month
                if created:
                    if month > 1:
                        prev_balance = LeaveBalance.objects.filter(
                            user=emp, leave_type=lt, year=year, month=month - 1
                        ).first()
                    else:
                        prev_balance = LeaveBalance.objects.filter(
                            user=emp, leave_type=lt, year=year - 1, month=12
                        ).first()

                    if prev_balance:
                        unused = float(prev_balance.total_leaves) + float(prev_balance.carried_forward) - float(prev_balance.used_leaves)
                        balance.carried_forward = max(0, unused)
                        balance.save()

                    created_count += 1

        return Response({
            "message": f"Initialized {created_count} leave balances for {month}/{year}"
        })


class MonthlyCreditView(APIView):
    """Add monthly leave credit (5 days) + carry forward unused leaves"""
    permission_classes = [IsAdminUser]

    def post(self, request):
        from accounts.models import User

        year = timezone.now().year
        month = timezone.now().month
        monthly_credit = 5  # 5 days per month

        employees = User.objects.filter(role='employee', is_active=True)
        leave_type = LeaveType.objects.filter(code='ML', is_active=True).first()

        if not leave_type:
            return Response(
                {"error": "Monthly Leave (ML) type not found"},
                status=status.HTTP_400_BAD_REQUEST
            )

        results = []
        for emp in employees:
            balance, created = LeaveBalance.objects.get_or_create(
                user=emp,
                leave_type=leave_type,
                year=year,
                month=month,
                defaults={
                    'total_leaves': monthly_credit,
                    'used_leaves': 0,
                    'carried_forward': 0,
                    'lop_days': 0
                }
            )

            if not created:
                # Calculate unused leaves from previous period
                unused = float(balance.total_leaves) + float(balance.carried_forward) - float(balance.used_leaves)

                # No max limit - all unused leaves carry forward within the year
                carry_forward = max(0, unused)

                # New month: add monthly credit + keep carry forward
                balance.carried_forward = carry_forward
                balance.total_leaves = monthly_credit
                balance.used_leaves = 0
                balance.save()

            results.append({
                'employee': emp.name,
                'new_credit': monthly_credit,
                'carry_forward': float(balance.carried_forward),
                'total_available': float(balance.available_leaves)
            })

        return Response({
            "message": f"Monthly credit added for {month}/{year}",
            "results": results
        })


class NewYearResetView(APIView):
    """Reset leave balances for new year - carry forward from previous year"""
    permission_classes = [IsAdminUser]

    def post(self, request):
        from accounts.models import User

        new_year = request.data.get('year', timezone.now().year)
        previous_year = new_year - 1

        employees = User.objects.filter(role='employee', is_active=True)
        leave_types = LeaveType.objects.filter(is_active=True)

        if not leave_types.exists():
            return Response(
                {"error": "No active leave types found"},
                status=status.HTTP_400_BAD_REQUEST
            )

        results = []
        for emp in employees:
            emp_result = {'employee': emp.name, 'balances': []}

            for leave_type in leave_types:
                # Get previous year balance
                prev_balance = LeaveBalance.objects.filter(
                    user=emp,
                    leave_type=leave_type,
                    year=previous_year
                ).first()

                # Calculate carry forward from previous year (only if leave type allows)
                carry_forward = 0
                if prev_balance and leave_type.is_carry_forward:
                    unused = float(prev_balance.total_leaves) + float(prev_balance.carried_forward) - float(prev_balance.used_leaves)
                    carry_forward = min(max(0, unused), leave_type.max_carry_forward) if leave_type.max_carry_forward > 0 else max(0, unused)

                # Create or update new year balance
                new_balance, created = LeaveBalance.objects.get_or_create(
                    user=emp,
                    leave_type=leave_type,
                    year=new_year,
                    defaults={
                        'total_leaves': leave_type.annual_quota,
                        'used_leaves': 0,
                        'carried_forward': carry_forward,
                        'lop_days': 0
                    }
                )

                if not created:
                    new_balance.total_leaves = leave_type.annual_quota
                    new_balance.used_leaves = 0
                    new_balance.carried_forward = carry_forward
                    new_balance.lop_days = 0
                    new_balance.save()

                emp_result['balances'].append({
                    'leave_type': leave_type.name,
                    'annual_quota': leave_type.annual_quota,
                    'carry_forward': carry_forward,
                    'total_available': float(new_balance.available_leaves)
                })

            results.append(emp_result)

        return Response({
            "message": f"New year {new_year} balances initialized for all employees",
            "results": results
        })


class UpdateLeaveBalanceView(APIView):
    """Admin can update employee's leave balance"""
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        try:
            balance = LeaveBalance.objects.get(pk=pk)
        except LeaveBalance.DoesNotExist:
            return Response(
                {"error": "Leave balance not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Update fields if provided
        if 'total_leaves' in request.data:
            balance.total_leaves = request.data['total_leaves']
        if 'used_leaves' in request.data:
            balance.used_leaves = request.data['used_leaves']
        if 'carried_forward' in request.data:
            balance.carried_forward = request.data['carried_forward']
        if 'lop_days' in request.data:
            balance.lop_days = request.data['lop_days']

        balance.save()

        return Response({
            "message": "Leave balance updated successfully",
            "data": LeaveBalanceSerializer(balance).data
        })


class UpdateLeaveRequestView(APIView):
    """Admin can update leave request even after approval/rejection"""
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        try:
            leave_request = LeaveRequest.objects.get(pk=pk)
        except LeaveRequest.DoesNotExist:
            return Response(
                {"error": "Leave request not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        old_status = leave_request.status
        old_paid_days = float(leave_request.paid_days)
        old_lop_days = float(leave_request.lop_days)

        # Update fields if provided
        if 'status' in request.data:
            leave_request.status = request.data['status']
        if 'paid_days' in request.data:
            leave_request.paid_days = request.data['paid_days']
        if 'lop_days' in request.data:
            leave_request.lop_days = request.data['lop_days']
        if 'review_remarks' in request.data:
            leave_request.review_remarks = request.data['review_remarks']

        # If status changed, update reviewed info
        if 'status' in request.data:
            leave_request.reviewed_by = request.user
            leave_request.reviewed_on = timezone.now()

        leave_request.save()
        leave_request.refresh_from_db()

        # Update leave balance if needed
        if old_status == 'approved' or leave_request.status == 'approved':
            year = leave_request.start_date.year
            month = leave_request.start_date.month
            balance = LeaveBalance.objects.filter(
                user=leave_request.user,
                leave_type=leave_request.leave_type,
                year=year,
                month=month
            ).first()

            if balance:
                # Reverse old deduction if was approved
                if old_status == 'approved':
                    balance.used_leaves = float(balance.used_leaves) - old_paid_days
                    balance.lop_days = float(balance.lop_days) - old_lop_days

                # Apply new deduction if now approved
                if leave_request.status == 'approved':
                    balance.used_leaves = float(balance.used_leaves) + float(leave_request.paid_days)
                    balance.lop_days = float(balance.lop_days) + float(leave_request.lop_days)

                balance.save()

        return Response({
            "message": "Leave request updated successfully",
            "data": LeaveRequestSerializer(leave_request).data
        })


class ExportLeaveReportCSVView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        year = request.query_params.get('year', timezone.now().year)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="leave_report_{year}.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'Employee Name', 'Leave Type', 'Total Leaves',
            'Used Leaves', 'Available Leaves', 'LOP Days'
        ])

        balances = LeaveBalance.objects.filter(year=year).select_related(
            'user', 'leave_type'
        ).order_by('user__name', 'leave_type__code')

        for bal in balances:
            writer.writerow([
                bal.user.name,
                bal.leave_type.code,
                bal.total_leaves,
                bal.used_leaves,
                bal.available_leaves,
                bal.lop_days
            ])

        return response


# Holiday views
class HolidayListView(generics.ListCreateAPIView):
    serializer_class = HolidaySerializer
    queryset = Holiday.objects.all()

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]


class HolidayDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = HolidaySerializer
    queryset = Holiday.objects.all()


class CheckTodayLeaveView(APIView):
    """Check if user has approved leave for today"""

    def get(self, request):
        today = timezone.now().date()

        # Find approved leave that includes today
        leave_request = LeaveRequest.objects.filter(
            user=request.user,
            status='approved',
            start_date__lte=today,
            end_date__gte=today
        ).select_related('leave_type').first()

        if leave_request:
            return Response({
                'has_leave': True,
                'leave_id': leave_request.id,
                'leave_type': leave_request.leave_type.name,
                'start_date': leave_request.start_date,
                'end_date': leave_request.end_date,
                'message': f'You have approved {leave_request.leave_type.name} from {leave_request.start_date} to {leave_request.end_date}'
            })

        return Response({
            'has_leave': False,
            'message': 'No approved leave for today'
        })


class ProcessMonthEndView(APIView):
    """
    API endpoint to process month-end:
    - Convert unused sick leave to comp off
    Can be called by cron services (similar to auto punch-out)
    """
    permission_classes = []  # Allow unauthenticated for cron

    def post(self, request):
        from django.conf import settings
        from attendance.models import CompOff
        from datetime import date, timedelta

        # Security check - require a secret key
        cron_secret = request.data.get('secret') or request.query_params.get('secret')
        expected_secret = getattr(settings, 'CRON_SECRET_KEY', 'your-cron-secret-key')

        if cron_secret != expected_secret:
            return Response(
                {"error": "Invalid cron secret"},
                status=status.HTTP_403_FORBIDDEN
            )

        today = timezone.now().date()

        # Process previous month
        if today.month == 1:
            process_month = 12
            process_year = today.year - 1
        else:
            process_month = today.month - 1
            process_year = today.year

        # Get sick leave type
        sick_leave = LeaveType.objects.filter(code='SL', is_active=True).first()
        if not sick_leave:
            return Response(
                {"error": "Sick Leave type not found"},
                status=status.HTTP_400_BAD_REQUEST
            )

        from accounts.models import User
        employees = User.objects.filter(role='employee', is_active=True)

        results = []
        comp_off_created = 0

        for employee in employees:
            # Get sick leave balance for the processed month
            sl_balance = LeaveBalance.objects.filter(
                user=employee,
                leave_type=sick_leave,
                year=process_year,
                month=process_month
            ).first()

            monthly_sick_leave = 1  # 1 sick leave per month
            used_this_month = float(sl_balance.used_leaves) if sl_balance else 0

            if used_this_month < monthly_sick_leave:
                unused_days = monthly_sick_leave - used_this_month

                # Last day of processed month
                if process_month == 12:
                    last_day = date(process_year, 12, 31)
                else:
                    last_day = date(process_year, process_month + 1, 1) - timedelta(days=1)

                # Check if already exists
                existing = CompOff.objects.filter(
                    user=employee,
                    earned_date=last_day,
                    reason__contains='Unused Sick Leave'
                ).first()

                if not existing:
                    CompOff.objects.create(
                        user=employee,
                        earned_date=last_day,
                        earned_hours=unused_days * 8,
                        credit_days=unused_days,
                        reason=f'Unused Sick Leave for {process_month}/{process_year}',
                        status='earned'
                    )
                    comp_off_created += 1
                    results.append({
                        'employee': employee.name,
                        'unused_sick_leave': unused_days,
                        'comp_off_created': True
                    })
                else:
                    results.append({
                        'employee': employee.name,
                        'message': 'Comp off already exists'
                    })
            else:
                results.append({
                    'employee': employee.name,
                    'sick_leave_used': used_this_month,
                    'comp_off_created': False
                })

        return Response({
            "message": f"Processed month-end for {process_month}/{process_year}",
            "comp_offs_created": comp_off_created,
            "results": results
        })


class CancelLeaveForDateView(APIView):
    """Cancel leave for a specific date - handles splitting if needed"""

    def post(self, request):
        date_str = request.data.get('date')
        if not date_str:
            date_to_cancel = timezone.now().date()
        else:
            from datetime import datetime
            date_to_cancel = datetime.strptime(date_str, '%Y-%m-%d').date()

        # Find approved leave that includes this date
        leave_request = LeaveRequest.objects.filter(
            user=request.user,
            status='approved',
            start_date__lte=date_to_cancel,
            end_date__gte=date_to_cancel
        ).select_related('leave_type').first()

        if not leave_request:
            return Response(
                {"error": "No approved leave found for this date"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get leave balance to restore
        year = leave_request.start_date.year
        month = leave_request.start_date.month

        balance = LeaveBalance.objects.filter(
            user=request.user,
            leave_type=leave_request.leave_type,
            year=year,
            month=month
        ).first()

        # Calculate days to restore (1 day or 0.5 for half day)
        days_to_restore = 0.5 if leave_request.is_half_day else 1

        # Handle different scenarios
        if leave_request.start_date == leave_request.end_date:
            # Single day leave - just cancel it
            leave_request.status = 'cancelled'
            leave_request.review_remarks = (leave_request.review_remarks or '') + f'\n[Auto-cancelled for {date_to_cancel} - Employee came to office]'
            leave_request.save()

            # Restore balance
            if balance:
                if leave_request.paid_days > 0:
                    balance.used_leaves = max(0, float(balance.used_leaves) - float(leave_request.paid_days))
                if leave_request.lop_days > 0:
                    balance.lop_days = max(0, float(balance.lop_days) - float(leave_request.lop_days))
                balance.save()

            # Remove on_leave status from attendance
            from attendance.models import Attendance
            Attendance.objects.filter(
                user=request.user,
                date=date_to_cancel,
                status='on_leave'
            ).delete()

        elif leave_request.start_date == date_to_cancel:
            # Cancel first day - move start date forward
            new_start = date_to_cancel + timezone.timedelta(days=1)
            old_paid = float(leave_request.paid_days)
            old_lop = float(leave_request.lop_days)

            leave_request.start_date = new_start
            # Recalculate days
            total_days = (leave_request.end_date - new_start).days + 1
            leave_request.paid_days = min(old_paid, total_days)
            leave_request.lop_days = max(0, total_days - leave_request.paid_days)
            leave_request.review_remarks = (leave_request.review_remarks or '') + f'\n[Start date changed from {date_to_cancel} - Employee came to office]'
            leave_request.save()

            # Restore 1 day to balance
            if balance:
                if old_paid > leave_request.paid_days:
                    balance.used_leaves = max(0, float(balance.used_leaves) - (old_paid - float(leave_request.paid_days)))
                if old_lop > leave_request.lop_days:
                    balance.lop_days = max(0, float(balance.lop_days) - (old_lop - float(leave_request.lop_days)))
                balance.save()

            # Remove on_leave status
            from attendance.models import Attendance
            Attendance.objects.filter(
                user=request.user,
                date=date_to_cancel,
                status='on_leave'
            ).delete()

        elif leave_request.end_date == date_to_cancel:
            # Cancel last day - move end date backward
            new_end = date_to_cancel - timezone.timedelta(days=1)
            old_paid = float(leave_request.paid_days)
            old_lop = float(leave_request.lop_days)

            leave_request.end_date = new_end
            # Recalculate days
            total_days = (new_end - leave_request.start_date).days + 1
            leave_request.paid_days = min(old_paid, total_days)
            leave_request.lop_days = max(0, total_days - leave_request.paid_days)
            leave_request.review_remarks = (leave_request.review_remarks or '') + f'\n[End date changed from {date_to_cancel} - Employee came to office]'
            leave_request.save()

            # Restore 1 day to balance
            if balance:
                if old_paid > leave_request.paid_days:
                    balance.used_leaves = max(0, float(balance.used_leaves) - (old_paid - float(leave_request.paid_days)))
                if old_lop > leave_request.lop_days:
                    balance.lop_days = max(0, float(balance.lop_days) - (old_lop - float(leave_request.lop_days)))
                balance.save()

            # Remove on_leave status
            from attendance.models import Attendance
            Attendance.objects.filter(
                user=request.user,
                date=date_to_cancel,
                status='on_leave'
            ).delete()

        else:
            # Date is in the middle - need to split into two leave requests
            original_end = leave_request.end_date
            old_paid = float(leave_request.paid_days)
            old_lop = float(leave_request.lop_days)
            old_total = (original_end - leave_request.start_date).days + 1

            # First part: start_date to (date_to_cancel - 1)
            new_end_first = date_to_cancel - timezone.timedelta(days=1)
            first_part_days = (new_end_first - leave_request.start_date).days + 1

            leave_request.end_date = new_end_first
            leave_request.paid_days = min(old_paid, first_part_days)
            leave_request.lop_days = max(0, first_part_days - leave_request.paid_days)
            leave_request.review_remarks = (leave_request.review_remarks or '') + f'\n[Split: Employee came to office on {date_to_cancel}]'
            leave_request.save()

            # Second part: (date_to_cancel + 1) to end_date
            new_start_second = date_to_cancel + timezone.timedelta(days=1)
            if new_start_second <= original_end:
                second_part_days = (original_end - new_start_second).days + 1
                remaining_paid = max(0, old_paid - first_part_days - 1)  # -1 for cancelled day
                second_paid = min(remaining_paid, second_part_days)
                second_lop = max(0, second_part_days - second_paid)

                LeaveRequest.objects.create(
                    user=request.user,
                    leave_type=leave_request.leave_type,
                    start_date=new_start_second,
                    end_date=original_end,
                    reason=leave_request.reason + f' [Split from original leave]',
                    status='approved',
                    reviewed_by=leave_request.reviewed_by,
                    reviewed_on=timezone.now(),
                    review_remarks=f'Auto-created from split leave. Original: {leave_request.start_date} to {original_end}',
                    paid_days=second_paid,
                    lop_days=second_lop,
                    is_lop=second_lop > 0
                )

            # Restore 1 day to balance
            if balance:
                # Calculate how much was saved
                new_total = first_part_days + (second_part_days if new_start_second <= original_end else 0)
                days_saved = old_total - new_total

                if old_paid > 0:
                    paid_saved = min(days_saved, old_paid - float(leave_request.paid_days))
                    balance.used_leaves = max(0, float(balance.used_leaves) - paid_saved)
                balance.save()

            # Remove on_leave status for the cancelled date
            from attendance.models import Attendance
            Attendance.objects.filter(
                user=request.user,
                date=date_to_cancel,
                status='on_leave'
            ).delete()

        return Response({
            "message": f"Leave cancelled for {date_to_cancel}. You can now punch in.",
            "date": str(date_to_cancel)
        })
