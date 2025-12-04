from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, OTP, Notification, ProfileUpdateRequest, ActivityLog


class UserSerializer(serializers.ModelSerializer):
    weekly_off_display = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()
    shift_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'mobile', 'email', 'name', 'role',
            'department', 'designation', 'weekly_off', 'weekly_off_display',
            'shift', 'shift_name',
            'date_joined', 'is_active', 'is_admin', 'photo_url', 'face_descriptor'
        ]
        read_only_fields = ['id', 'date_joined', 'shift']

    def get_weekly_off_display(self, obj):
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        return days[obj.weekly_off] if obj.weekly_off is not None else 'Sunday'

    def get_photo_url(self, obj):
        if obj.photo:
            # Always return the URL directly - Cloudinary handles full URLs
            return obj.photo.url
        return None

    def get_shift_name(self, obj):
        return obj.shift.name if obj.shift else None


class UserProfileSerializer(serializers.ModelSerializer):
    """Full profile serializer with all details"""
    weekly_off_display = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()
    aadhaar_photo_url = serializers.SerializerMethodField()
    pan_photo_url = serializers.SerializerMethodField()
    has_pending_update = serializers.SerializerMethodField()
    shift_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'mobile', 'email', 'name', 'photo', 'photo_url', 'role',
            'department', 'designation', 'weekly_off', 'weekly_off_display',
            'shift', 'shift_name',
            'date_joined', 'is_active', 'is_admin',
            # Family
            'father_name', 'father_phone',
            # Aadhaar
            'aadhaar_number', 'aadhaar_photo', 'aadhaar_photo_url',
            # PAN
            'pan_number', 'pan_photo', 'pan_photo_url',
            # Bank
            'bank_account_number', 'bank_holder_name', 'bank_name', 'bank_ifsc',
            # Address
            'address',
            # Face Recognition
            'face_descriptor',
            # Status
            'has_pending_update'
        ]
        read_only_fields = ['id', 'date_joined', 'role', 'is_admin', 'shift']

    def get_weekly_off_display(self, obj):
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        return days[obj.weekly_off] if obj.weekly_off is not None else 'Sunday'

    def get_photo_url(self, obj):
        if obj.photo:
            # Always return the URL directly - Cloudinary handles full URLs
            return obj.photo.url
        return None

    def get_aadhaar_photo_url(self, obj):
        if obj.aadhaar_photo:
            return obj.aadhaar_photo.url
        return None

    def get_pan_photo_url(self, obj):
        if obj.pan_photo:
            return obj.pan_photo.url
        return None

    def get_has_pending_update(self, obj):
        return ProfileUpdateRequest.objects.filter(user=obj, status='pending').exists()

    def get_shift_name(self, obj):
        return obj.shift.name if obj.shift else None

    def validate_photo(self, value):
        """Compress profile photo on upload"""
        if value:
            from .image_utils import compress_profile_photo
            return compress_profile_photo(value)
        return value

    def validate_aadhaar_photo(self, value):
        """Compress aadhaar photo on upload"""
        if value:
            from .image_utils import compress_document_photo
            return compress_document_photo(value)
        return value

    def validate_pan_photo(self, value):
        """Compress pan photo on upload"""
        if value:
            from .image_utils import compress_document_photo
            return compress_document_photo(value)
        return value


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            'mobile', 'email', 'name', 'password',
            'role', 'department', 'designation', 'weekly_off'
        ]

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User.objects.create_user(**validated_data, password=password)
        return user


class AdminSignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['mobile', 'email', 'name', 'password', 'confirm_password']

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords do not match")
        if User.objects.filter(is_admin=True).exists():
            raise serializers.ValidationError("Admin already exists")
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        user = User.objects.create_superuser(
            mobile=validated_data['mobile'],
            password=validated_data['password'],
            name=validated_data['name'],
            email=validated_data.get('email', ''),
            role='admin'
        )
        return user


class LoginSerializer(serializers.Serializer):
    mobile = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        mobile = data.get('mobile')
        password = data.get('password')

        if mobile and password:
            user = authenticate(username=mobile, password=password)
            if not user:
                raise serializers.ValidationError("Invalid credentials")
            if not user.is_active:
                raise serializers.ValidationError("User account is disabled")
            data['user'] = user
        else:
            raise serializers.ValidationError("Must provide mobile and password")
        return data


class OTPRequestSerializer(serializers.Serializer):
    mobile = serializers.CharField()

    def validate_mobile(self, value):
        if not User.objects.filter(mobile=value).exists():
            raise serializers.ValidationError("User with this mobile does not exist")
        return value


class OTPVerifySerializer(serializers.Serializer):
    mobile = serializers.CharField()
    otp = serializers.CharField(max_length=6)

    def validate(self, data):
        mobile = data.get('mobile')
        otp = data.get('otp')

        try:
            user = User.objects.get(mobile=mobile)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found")

        otp_obj = OTP.objects.filter(
            user=user,
            otp=otp,
            is_used=False
        ).order_by('-created_at').first()

        if not otp_obj or not otp_obj.is_valid():
            raise serializers.ValidationError("Invalid or expired OTP")

        data['user'] = user
        data['otp_obj'] = otp_obj
        return data


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=6)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect")
        return value


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'notification_type',
            'is_read', 'related_id', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ProfileUpdateRequestSerializer(serializers.ModelSerializer):
    user_details = serializers.SerializerMethodField()
    requested_photo_url = serializers.SerializerMethodField()
    requested_aadhaar_photo_url = serializers.SerializerMethodField()
    requested_pan_photo_url = serializers.SerializerMethodField()
    reviewer_name = serializers.SerializerMethodField()

    class Meta:
        model = ProfileUpdateRequest
        fields = [
            'id', 'user', 'user_details',
            'requested_name', 'requested_email',
            'requested_father_name', 'requested_father_phone',
            'requested_aadhaar_number', 'requested_aadhaar_photo', 'requested_aadhaar_photo_url',
            'requested_pan_number', 'requested_pan_photo', 'requested_pan_photo_url',
            'requested_bank_account_number', 'requested_bank_holder_name', 'requested_bank_name', 'requested_bank_ifsc',
            'requested_address',
            'requested_photo', 'requested_photo_url',
            'changed_fields', 'reason', 'status',
            'review_remarks', 'reviewed_by', 'reviewer_name', 'reviewed_on',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'status', 'reviewed_by', 'reviewed_on', 'created_at', 'updated_at']

    def get_user_details(self, obj):
        return {
            'id': obj.user.id,
            'name': obj.user.name,
            'mobile': obj.user.mobile,
            'department': obj.user.department,
            'designation': obj.user.designation
        }

    def get_requested_photo_url(self, obj):
        if obj.requested_photo:
            return obj.requested_photo.url
        return None

    def get_requested_aadhaar_photo_url(self, obj):
        if obj.requested_aadhaar_photo:
            return obj.requested_aadhaar_photo.url
        return None

    def get_requested_pan_photo_url(self, obj):
        if obj.requested_pan_photo:
            return obj.requested_pan_photo.url
        return None

    def get_reviewer_name(self, obj):
        return obj.reviewed_by.name if obj.reviewed_by else None


class ProfileUpdateRequestCreateSerializer(serializers.Serializer):
    """Serializer for creating profile update requests"""
    # Text fields
    name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    father_name = serializers.CharField(required=False, allow_blank=True)
    father_phone = serializers.CharField(required=False, allow_blank=True)
    aadhaar_number = serializers.CharField(required=False, allow_blank=True)
    pan_number = serializers.CharField(required=False, allow_blank=True)
    bank_account_number = serializers.CharField(required=False, allow_blank=True)
    bank_holder_name = serializers.CharField(required=False, allow_blank=True)
    bank_name = serializers.CharField(required=False, allow_blank=True)
    bank_ifsc = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)

    # Photo fields
    photo = serializers.ImageField(required=False)
    aadhaar_photo = serializers.ImageField(required=False)
    pan_photo = serializers.ImageField(required=False)

    # Face descriptor (saved directly without approval)
    face_descriptor = serializers.CharField(required=False, allow_blank=True)

    # Reason for update
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate_photo(self, value):
        """Compress profile photo"""
        if value:
            from .image_utils import compress_profile_photo
            return compress_profile_photo(value)
        return value

    def validate_aadhaar_photo(self, value):
        """Compress aadhaar photo"""
        if value:
            from .image_utils import compress_document_photo
            return compress_document_photo(value)
        return value

    def validate_pan_photo(self, value):
        """Compress pan photo"""
        if value:
            from .image_utils import compress_document_photo
            return compress_document_photo(value)
        return value


class ActivityLogSerializer(serializers.ModelSerializer):
    """Serializer for Activity Log"""
    actor_name = serializers.SerializerMethodField()
    actor_photo = serializers.SerializerMethodField()
    target_user_name = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()
    formatted_time = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = [
            'id', 'actor', 'actor_name', 'actor_photo',
            'target_user', 'target_user_name',
            'activity_type', 'category', 'title', 'description',
            'related_model', 'related_id', 'extra_data',
            'created_at', 'time_ago', 'formatted_time'
        ]

    def get_actor_name(self, obj):
        return obj.actor.name if obj.actor else 'System'

    def get_actor_photo(self, obj):
        try:
            if obj.actor and obj.actor.photo:
                return obj.actor.photo.url
        except Exception:
            pass
        return None

    def get_target_user_name(self, obj):
        return obj.target_user.name if obj.target_user else None

    def get_time_ago(self, obj):
        try:
            from django.utils import timezone
            now = timezone.now()
            diff = now - obj.created_at

            seconds = diff.total_seconds()
            if seconds < 60:
                return 'Just now'
            elif seconds < 3600:
                minutes = int(seconds / 60)
                return f'{minutes}m ago'
            elif seconds < 86400:
                hours = int(seconds / 3600)
                return f'{hours}h ago'
            elif seconds < 604800:
                days = int(seconds / 86400)
                return f'{days}d ago'
            else:
                return obj.created_at.strftime('%d %b')
        except Exception:
            return ''

    def get_formatted_time(self, obj):
        try:
            import pytz
            ist = pytz.timezone('Asia/Kolkata')
            local_time = obj.created_at.astimezone(ist)
            return local_time.strftime('%I:%M %p')
        except Exception:
            return ''
