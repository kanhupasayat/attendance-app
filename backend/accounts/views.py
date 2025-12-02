from rest_framework import status, generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone

from .models import User, OTP, Notification, ProfileUpdateRequest
from .serializers import (
    UserSerializer, UserProfileSerializer, UserCreateSerializer, AdminSignupSerializer,
    LoginSerializer, OTPRequestSerializer, OTPVerifySerializer,
    ChangePasswordSerializer, NotificationSerializer,
    ProfileUpdateRequestSerializer, ProfileUpdateRequestCreateSerializer
)
from .utils import notify_profile_update_applied, notify_profile_update_status


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_admin


class AdminSignupView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # Check if admin already exists
        if User.objects.filter(is_admin=True).exists():
            return Response(
                {"error": "Admin already exists"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AdminSignupSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                "message": "Admin created successfully",
                "user": UserSerializer(user, context={'request': request}).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token)
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            return Response({
                "message": "Login successful",
                "user": UserSerializer(user, context={'request': request}).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token)
                }
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OTPRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        if serializer.is_valid():
            mobile = serializer.validated_data['mobile']
            user = User.objects.get(mobile=mobile)

            # Create OTP
            otp = OTP.objects.create(
                user=user,
                expires_at=timezone.now() + timezone.timedelta(minutes=10)
            )

            # In production, send OTP via SMS gateway
            # TODO: Integrate SMS gateway here
            return Response({
                "message": "OTP sent successfully"
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OTPVerifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            otp_obj = serializer.validated_data['otp_obj']

            # Mark OTP as used
            otp_obj.is_used = True
            otp_obj.save()

            refresh = RefreshToken.for_user(user)
            return Response({
                "message": "OTP verified successfully",
                "user": UserSerializer(user, context={'request': request}).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token)
                }
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        serializer = UserProfileSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    def patch(self, request):
        # Admin can directly update their profile
        if request.user.is_admin:
            serializer = UserProfileSerializer(
                request.user, data=request.data, partial=True, context={'request': request}
            )
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            # Employees cannot directly update - they need to create update requests
            return Response(
                {'error': 'Employees must submit profile update requests for admin approval'},
                status=status.HTTP_403_FORBIDDEN
            )


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={'request': request}
        )
        if serializer.is_valid():
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            return Response({"message": "Password changed successfully"})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Admin only views
class EmployeeListView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = UserSerializer

    def get_queryset(self):
        return User.objects.filter(role='employee')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                UserSerializer(user).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmployeeDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = UserProfileSerializer
    queryset = User.objects.filter(role='employee')


class CheckAdminExistsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        admin_exists = User.objects.filter(is_admin=True).exists()
        return Response({"admin_exists": admin_exists})


class AdminDashboardStatsView(APIView):
    """Get dashboard statistics for admin"""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from attendance.models import Attendance
        from leaves.models import LeaveRequest

        today = timezone.now().date()

        # Employee stats
        total_employees = User.objects.filter(role='employee', is_active=True).count()

        # Today's attendance
        today_present = Attendance.objects.filter(
            date=today,
            punch_in__isnull=False
        ).count()

        today_on_leave = Attendance.objects.filter(
            date=today,
            status='on_leave'
        ).count()

        # Leave requests stats
        pending_leaves = LeaveRequest.objects.filter(status='pending').count()
        approved_today = LeaveRequest.objects.filter(
            status='approved',
            reviewed_on__date=today
        ).count()

        # This month's stats
        current_month = today.month
        current_year = today.year

        leaves_this_month = LeaveRequest.objects.filter(
            status='approved',
            start_date__month=current_month,
            start_date__year=current_year
        ).count()

        return Response({
            'total_employees': total_employees,
            'today_present': today_present,
            'today_absent': total_employees - today_present - today_on_leave,
            'today_on_leave': today_on_leave,
            'pending_leave_requests': pending_leaves,
            'approved_today': approved_today,
            'leaves_this_month': leaves_this_month
        })


# Notification Views
class NotificationListView(generics.ListAPIView):
    """Get all notifications for the current user"""
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class UnreadNotificationCountView(APIView):
    """Get count of unread notifications"""

    def get(self, request):
        count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).count()
        return Response({'unread_count': count})


class MarkNotificationReadView(APIView):
    """Mark a notification as read"""

    def post(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
            notification.is_read = True
            notification.save()
            return Response({'message': 'Notification marked as read'})
        except Notification.DoesNotExist:
            return Response(
                {'error': 'Notification not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class MarkAllNotificationsReadView(APIView):
    """Mark all notifications as read"""

    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'message': 'All notifications marked as read'})


class ClearNotificationsView(APIView):
    """Clear all read notifications"""

    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=True).delete()
        return Response({'message': 'Notifications cleared'})


# Profile Update Request Views
class ProfileUpdateRequestView(APIView):
    """Submit a profile update request (for employees)"""
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        # Check if there's already a pending request
        if ProfileUpdateRequest.objects.filter(user=request.user, status='pending').exists():
            return Response(
                {'error': 'You already have a pending profile update request. Please wait for admin approval.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ProfileUpdateRequestCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        user = request.user

        # Track which fields are being changed
        changed_fields = []

        # Create update request
        update_request = ProfileUpdateRequest(user=user)

        # Map fields and check for changes
        field_mapping = {
            'name': ('requested_name', user.name),
            'email': ('requested_email', user.email or ''),
            'father_name': ('requested_father_name', user.father_name),
            'father_phone': ('requested_father_phone', user.father_phone),
            'aadhaar_number': ('requested_aadhaar_number', user.aadhaar_number),
            'pan_number': ('requested_pan_number', user.pan_number),
            'bank_account_number': ('requested_bank_account_number', user.bank_account_number),
            'bank_holder_name': ('requested_bank_holder_name', user.bank_holder_name),
            'bank_name': ('requested_bank_name', user.bank_name),
            'bank_ifsc': ('requested_bank_ifsc', user.bank_ifsc),
            'address': ('requested_address', user.address),
        }

        for field_name, (request_field, current_value) in field_mapping.items():
            if field_name in data and data[field_name]:
                new_value = data[field_name]
                if str(new_value) != str(current_value):
                    setattr(update_request, request_field, new_value)
                    changed_fields.append(field_name)

        # Handle photo uploads
        if 'photo' in data and data['photo']:
            update_request.requested_photo = data['photo']
            changed_fields.append('photo')

        if 'aadhaar_photo' in data and data['aadhaar_photo']:
            update_request.requested_aadhaar_photo = data['aadhaar_photo']
            changed_fields.append('aadhaar_photo')

        if 'pan_photo' in data and data['pan_photo']:
            update_request.requested_pan_photo = data['pan_photo']
            changed_fields.append('pan_photo')

        if not changed_fields:
            return Response(
                {'error': 'No changes detected in the submitted data'},
                status=status.HTTP_400_BAD_REQUEST
            )

        update_request.changed_fields = ','.join(changed_fields)
        update_request.reason = data.get('reason', '')
        update_request.save()

        # Notify all admins (with email)
        notify_profile_update_applied(update_request)

        return Response({
            'message': 'Profile update request submitted successfully. Waiting for admin approval.',
            'request_id': update_request.id,
            'changed_fields': changed_fields
        }, status=status.HTTP_201_CREATED)


class MyProfileUpdateRequestsView(generics.ListAPIView):
    """Get all profile update requests for current user"""
    serializer_class = ProfileUpdateRequestSerializer

    def get_queryset(self):
        return ProfileUpdateRequest.objects.filter(user=self.request.user)


class CancelProfileUpdateRequestView(APIView):
    """Cancel a pending profile update request"""

    def post(self, request, pk):
        try:
            update_request = ProfileUpdateRequest.objects.get(
                pk=pk, user=request.user, status='pending'
            )
            update_request.status = 'cancelled'
            update_request.save()
            return Response({'message': 'Profile update request cancelled'})
        except ProfileUpdateRequest.DoesNotExist:
            return Response(
                {'error': 'Pending request not found'},
                status=status.HTTP_404_NOT_FOUND
            )


# Admin Views for Profile Update Requests
class AllProfileUpdateRequestsView(generics.ListAPIView):
    """Get all profile update requests (admin only)"""
    permission_classes = [IsAdminUser]
    serializer_class = ProfileUpdateRequestSerializer

    def get_queryset(self):
        queryset = ProfileUpdateRequest.objects.all()
        status_filter = self.request.query_params.get('status', '')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset


class ReviewProfileUpdateRequestView(APIView):
    """Approve or reject a profile update request (admin only)"""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        # Get raw data from database without loading files
        try:
            request_data = ProfileUpdateRequest.objects.filter(
                pk=pk, status='pending'
            ).values(
                'id', 'user_id',
                'requested_name', 'requested_email',
                'requested_father_name', 'requested_father_phone',
                'requested_aadhaar_number', 'requested_pan_number',
                'requested_bank_account_number', 'requested_bank_holder_name',
                'requested_bank_name', 'requested_bank_ifsc', 'requested_address',
                'requested_photo', 'requested_aadhaar_photo', 'requested_pan_photo'
            ).first()

            if not request_data:
                return Response(
                    {'error': 'Pending request not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        action = request.data.get('status')
        remarks = request.data.get('review_remarks', '')

        if action not in ['approved', 'rejected']:
            return Response(
                {'error': 'Invalid action. Use "approved" or "rejected"'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update the request status
        ProfileUpdateRequest.objects.filter(pk=pk).update(
            status=action,
            review_remarks=remarks,
            reviewed_by=request.user,
            reviewed_on=timezone.now()
        )

        if action == 'approved':
            # Build update dict for user
            user_updates = {}

            field_mapping = {
                'name': 'requested_name',
                'email': 'requested_email',
                'father_name': 'requested_father_name',
                'father_phone': 'requested_father_phone',
                'aadhaar_number': 'requested_aadhaar_number',
                'pan_number': 'requested_pan_number',
                'bank_account_number': 'requested_bank_account_number',
                'bank_holder_name': 'requested_bank_holder_name',
                'bank_name': 'requested_bank_name',
                'bank_ifsc': 'requested_bank_ifsc',
                'address': 'requested_address',
            }

            for user_field, request_field in field_mapping.items():
                value = request_data.get(request_field)
                if value is not None:
                    user_updates[user_field] = value

            # Handle photo paths directly (raw strings from DB)
            if request_data.get('requested_photo'):
                user_updates['photo'] = request_data['requested_photo']
            if request_data.get('requested_aadhaar_photo'):
                user_updates['aadhaar_photo'] = request_data['requested_aadhaar_photo']
            if request_data.get('requested_pan_photo'):
                user_updates['pan_photo'] = request_data['requested_pan_photo']

            # Direct database update - no file operations
            if user_updates:
                User.objects.filter(pk=request_data['user_id']).update(**user_updates)

        # Send notification (in-app only)
        try:
            user = User.objects.get(pk=request_data['user_id'])
            notification_type = 'profile_update_approved' if action == 'approved' else 'profile_update_rejected'
            Notification.objects.create(
                user=user,
                title=f"Profile Update {action.title()}",
                message=f"Your profile update request has been {action}.",
                notification_type=notification_type,
                related_id=pk
            )
        except Exception:
            pass  # Ignore notification errors

        return Response({
            'message': f'Profile update request {action}',
            'request_id': pk
        })
