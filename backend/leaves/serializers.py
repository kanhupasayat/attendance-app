from rest_framework import serializers
from .models import LeaveType, LeaveBalance, LeaveRequest, Holiday
from accounts.serializers import UserSerializer


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = [
            'id', 'name', 'code', 'annual_quota',
            'is_carry_forward', 'max_carry_forward',
            'description', 'is_active'
        ]
        read_only_fields = ['id']


class LeaveBalanceSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    leave_type_details = LeaveTypeSerializer(source='leave_type', read_only=True)
    available_leaves = serializers.DecimalField(
        max_digits=5, decimal_places=1, read_only=True
    )
    month_name = serializers.SerializerMethodField()

    class Meta:
        model = LeaveBalance
        fields = [
            'id', 'user', 'user_details', 'leave_type', 'leave_type_details',
            'year', 'month', 'month_name', 'total_leaves', 'used_leaves',
            'carried_forward', 'lop_days', 'available_leaves',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_month_name(self, obj):
        months = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December']
        return months[obj.month] if 1 <= obj.month <= 12 else ''


class LeaveRequestSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    leave_type_details = LeaveTypeSerializer(source='leave_type', read_only=True)
    reviewed_by_details = UserSerializer(source='reviewed_by', read_only=True)

    class Meta:
        model = LeaveRequest
        fields = [
            'id', 'user', 'user_details',
            'leave_type', 'leave_type_details',
            'start_date', 'end_date',
            'is_half_day', 'half_day_type', 'total_days',
            'comp_off_days', 'paid_days', 'lop_days',
            'reason', 'status', 'applied_on',
            'reviewed_by', 'reviewed_by_details',
            'reviewed_on', 'review_remarks', 'is_lop',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'total_days', 'comp_off_days', 'paid_days', 'lop_days',
            'status', 'applied_on',
            'reviewed_by', 'reviewed_on', 'is_lop',
            'created_at', 'updated_at'
        ]

    def validate(self, data):
        start_date = data.get('start_date')
        end_date = data.get('end_date')

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError(
                "End date must be after start date"
            )
        return data


class LeaveApplySerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveRequest
        fields = [
            'leave_type', 'start_date', 'end_date',
            'is_half_day', 'half_day_type', 'reason'
        ]

    def validate(self, data):
        start_date = data.get('start_date')
        end_date = data.get('end_date')

        if start_date > end_date:
            raise serializers.ValidationError(
                "End date must be after start date"
            )

        if data.get('is_half_day') and start_date != end_date:
            raise serializers.ValidationError(
                "Half day leave must be for a single day"
            )

        return data


class LeaveReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['approved', 'rejected'])
    remarks = serializers.CharField(required=False, allow_blank=True)


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = ['id', 'name', 'date', 'is_optional', 'description']
        read_only_fields = ['id']


class LeaveReportSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    user_name = serializers.CharField()
    leave_type = serializers.CharField()
    total_leaves = serializers.DecimalField(max_digits=5, decimal_places=1)
    used_leaves = serializers.DecimalField(max_digits=5, decimal_places=1)
    available_leaves = serializers.DecimalField(max_digits=5, decimal_places=1)
    lop_days = serializers.DecimalField(max_digits=5, decimal_places=1)
