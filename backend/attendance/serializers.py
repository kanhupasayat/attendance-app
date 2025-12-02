from rest_framework import serializers
from .models import Attendance, OfficeLocation, RegularizationRequest, WFHRequest, Shift, CompOff
from accounts.serializers import UserSerializer


class AttendanceSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)

    class Meta:
        model = Attendance
        fields = [
            'id', 'user', 'user_details', 'date',
            'punch_in', 'punch_out',
            'punch_in_latitude', 'punch_in_longitude',
            'punch_out_latitude', 'punch_out_longitude',
            'punch_in_ip', 'punch_out_ip',
            'status', 'working_hours', 'is_off_day', 'is_wfh', 'is_auto_punch_out', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'working_hours', 'is_off_day', 'is_wfh', 'is_auto_punch_out', 'created_at', 'updated_at'
        ]


class PunchInSerializer(serializers.Serializer):
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)


class PunchOutSerializer(serializers.Serializer):
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)


class OfficeLocationSerializer(serializers.ModelSerializer):
    # Use FloatField for more flexible input handling
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)

    class Meta:
        model = OfficeLocation
        fields = [
            'id', 'name', 'latitude', 'longitude',
            'radius_meters', 'allowed_ips', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AttendanceReportSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    user_name = serializers.CharField()
    total_present = serializers.IntegerField()
    total_absent = serializers.IntegerField()
    total_half_day = serializers.IntegerField()
    total_on_leave = serializers.IntegerField()
    total_working_hours = serializers.DecimalField(max_digits=6, decimal_places=2)


class RegularizationRequestSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    reviewed_by_details = UserSerializer(source='reviewed_by', read_only=True)

    class Meta:
        model = RegularizationRequest
        fields = [
            'id', 'user', 'user_details', 'attendance', 'date',
            'request_type', 'requested_punch_in', 'requested_punch_out',
            'reason', 'status', 'reviewed_by', 'reviewed_by_details',
            'reviewed_on', 'review_remarks', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'status', 'reviewed_by', 'reviewed_on',
            'created_at', 'updated_at'
        ]


class RegularizationApplySerializer(serializers.Serializer):
    date = serializers.DateField()
    request_type = serializers.ChoiceField(choices=RegularizationRequest.REQUEST_TYPE_CHOICES)
    requested_punch_in = serializers.TimeField(required=False, allow_null=True)
    requested_punch_out = serializers.TimeField(required=False, allow_null=True)
    reason = serializers.CharField()


class RegularizationReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['approved', 'rejected'])
    review_remarks = serializers.CharField(required=False, allow_blank=True)


# WFH Serializers
class WFHRequestSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    reviewed_by_details = UserSerializer(source='reviewed_by', read_only=True)

    class Meta:
        model = WFHRequest
        fields = [
            'id', 'user', 'user_details', 'date', 'reason',
            'status', 'reviewed_by', 'reviewed_by_details',
            'reviewed_on', 'review_remarks', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'status', 'reviewed_by', 'reviewed_on',
            'created_at', 'updated_at'
        ]


class WFHApplySerializer(serializers.Serializer):
    date = serializers.DateField()
    reason = serializers.CharField()


class WFHReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['approved', 'rejected'])
    review_remarks = serializers.CharField(required=False, allow_blank=True)


# Admin Attendance Management Serializers
class AdminAttendanceCreateSerializer(serializers.Serializer):
    """Serializer for admin to add attendance for any employee"""
    user_id = serializers.IntegerField()
    date = serializers.DateField()
    punch_in = serializers.TimeField(required=False, allow_null=True)
    punch_out = serializers.TimeField(required=False, allow_null=True)
    status = serializers.ChoiceField(
        choices=['present', 'absent', 'half_day', 'on_leave'],
        default='present'
    )
    notes = serializers.CharField(required=False, allow_blank=True)


class AdminAttendanceUpdateSerializer(serializers.Serializer):
    """Serializer for admin to update attendance"""
    punch_in = serializers.TimeField(required=False, allow_null=True)
    punch_out = serializers.TimeField(required=False, allow_null=True)
    status = serializers.ChoiceField(
        choices=['present', 'absent', 'half_day', 'on_leave'],
        required=False
    )
    notes = serializers.CharField(required=False, allow_blank=True)


# Shift Serializers
class ShiftSerializer(serializers.ModelSerializer):
    total_hours = serializers.SerializerMethodField()
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = Shift
        fields = [
            'id', 'name', 'start_time', 'end_time',
            'break_start', 'break_end', 'break_duration_hours',
            'grace_period_minutes', 'is_active', 'total_hours',
            'employee_count', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_total_hours(self, obj):
        return obj.get_total_hours()

    def get_employee_count(self, obj):
        return obj.employees.filter(is_active=True).count()


class ShiftCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = [
            'name', 'start_time', 'end_time',
            'break_start', 'break_end', 'break_duration_hours',
            'grace_period_minutes', 'is_active'
        ]

    def validate(self, data):
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        break_start = data.get('break_start')
        break_end = data.get('break_end')

        # Validate break times are within shift hours
        if break_start and break_end and start_time and end_time:
            if break_start < start_time or break_end > end_time:
                raise serializers.ValidationError(
                    "Break time must be within shift hours"
                )
            if break_start >= break_end:
                raise serializers.ValidationError(
                    "Break start time must be before break end time"
                )

        return data


# Comp Off Serializers
class CompOffSerializer(serializers.ModelSerializer):
    user_details = serializers.SerializerMethodField()

    class Meta:
        model = CompOff
        fields = [
            'id', 'user', 'user_details', 'earned_date', 'earned_hours',
            'credit_days', 'reason', 'status', 'used_date', 'expires_on',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_user_details(self, obj):
        return {
            'id': obj.user.id,
            'name': obj.user.name,
            'mobile': obj.user.mobile,
            'department': obj.user.department
        }


class CompOffUseSerializer(serializers.Serializer):
    """Serializer for using comp off as leave"""
    comp_off_id = serializers.IntegerField()
    use_date = serializers.DateField()
