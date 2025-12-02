
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
import random
import string


class UserManager(BaseUserManager):
    def create_user(self, mobile, password=None, **extra_fields):
        if not mobile:
            raise ValueError('Mobile number is required')
        user = self.model(mobile=mobile, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, mobile, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_admin', True)
        extra_fields.setdefault('is_active', True)
        return self.create_user(mobile, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('employee', 'Employee'),
    )

    WEEKDAY_CHOICES = (
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    )

    # Basic Info
    mobile = models.CharField(max_length=15, unique=True)
    email = models.EmailField(blank=True, null=True)
    name = models.CharField(max_length=100)
    photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')
    department = models.CharField(max_length=100, blank=True)
    designation = models.CharField(max_length=100, blank=True)
    weekly_off = models.IntegerField(choices=WEEKDAY_CHOICES, default=6, help_text="Weekly off day (0=Monday, 6=Sunday)")
    shift = models.ForeignKey(
        'attendance.Shift',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='employees',
        help_text="Employee's assigned shift"
    )
    date_joined = models.DateTimeField(default=timezone.now)

    # Father's Contact
    father_name = models.CharField(max_length=100, blank=True)
    father_phone = models.CharField(max_length=15, blank=True)

    # Aadhaar Details
    aadhaar_number = models.CharField(max_length=12, blank=True)
    aadhaar_photo = models.ImageField(upload_to='aadhaar_photos/', blank=True, null=True)

    # PAN Card Details
    pan_number = models.CharField(max_length=10, blank=True)
    pan_photo = models.ImageField(upload_to='pan_photos/', blank=True, null=True)

    # Bank Details
    bank_account_number = models.CharField(max_length=20, blank=True)
    bank_holder_name = models.CharField(max_length=100, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    bank_ifsc = models.CharField(max_length=11, blank=True)

    # Address
    address = models.TextField(blank=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_admin = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = 'mobile'
    REQUIRED_FIELDS = ['name']

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.name} ({self.mobile})"


class OTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps')
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = 'otps'

    def save(self, *args, **kwargs):
        if not self.otp:
            self.otp = ''.join(random.choices(string.digits, k=6))
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(minutes=10)
        super().save(*args, **kwargs)

    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at

    def __str__(self):
        return f"OTP for {self.user.mobile}"


class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('system', 'System'),
        ('leave_applied', 'Leave Applied'),
        ('leave_approved', 'Leave Approved'),
        ('leave_rejected', 'Leave Rejected'),
        ('regularization_applied', 'Regularization Applied'),
        ('regularization_approved', 'Regularization Approved'),
        ('regularization_rejected', 'Regularization Rejected'),
        ('profile_update_requested', 'Profile Update Requested'),
        ('profile_update_approved', 'Profile Update Approved'),
        ('profile_update_rejected', 'Profile Update Rejected'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES, default='system')
    related_id = models.IntegerField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.user.name}"


class ProfileUpdateRequest(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='profile_update_requests')

    # Requested changes (JSON-like storage for text fields)
    requested_name = models.CharField(max_length=100, blank=True, null=True)
    requested_email = models.EmailField(blank=True, null=True)
    requested_father_name = models.CharField(max_length=100, blank=True, null=True)
    requested_father_phone = models.CharField(max_length=15, blank=True, null=True)
    requested_aadhaar_number = models.CharField(max_length=12, blank=True, null=True)
    requested_pan_number = models.CharField(max_length=10, blank=True, null=True)
    requested_bank_account_number = models.CharField(max_length=20, blank=True, null=True)
    requested_bank_holder_name = models.CharField(max_length=100, blank=True, null=True)
    requested_bank_name = models.CharField(max_length=100, blank=True, null=True)
    requested_bank_ifsc = models.CharField(max_length=11, blank=True, null=True)
    requested_address = models.TextField(blank=True, null=True)

    # Photo uploads
    requested_photo = models.ImageField(upload_to='profile_update_requests/photos/', blank=True, null=True)
    requested_aadhaar_photo = models.ImageField(upload_to='profile_update_requests/aadhaar/', blank=True, null=True)
    requested_pan_photo = models.ImageField(upload_to='profile_update_requests/pan/', blank=True, null=True)

    # Track what fields are being changed
    changed_fields = models.TextField(help_text="Comma-separated list of fields being changed")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reason = models.TextField(blank=True, help_text="Reason for update request")
    review_remarks = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_profile_requests')
    reviewed_on = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'profile_update_requests'
        ordering = ['-created_at']

    def __str__(self):
        return f"Profile Update Request - {self.user.name} ({self.status})"
