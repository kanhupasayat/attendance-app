from rest_framework import serializers
from .models import Attendance, OfficeLocation, RegularizationRequest, WFHRequest
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
