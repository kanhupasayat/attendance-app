from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import time, timedelta

# Office Configuration
OFFICE_START_TIME = time(10, 0)  # 10:00 AM
OFFICE_END_TIME = time(19, 0)    # 7:00 PM
BREAK_START_TIME = time(14, 0)   # 2:00 PM
BREAK_END_TIME = time(15, 0)     # 3:00 PM
BREAK_DURATION_HOURS = 1         # 1 hour break

# Working hours configuration
FULL_DAY_HOURS = 8               # 8 hours = full day (9 hours - 1 hour break)
HALF_DAY_MIN_HOURS = 4           # Minimum 4 hours for half day
HALF_DAY_MAX_HOURS = 6           # Less than 6 hours = half day


class Attendance(models.Model):
    STATUS_CHOICES = (
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('half_day', 'Half Day'),
        ('on_leave', 'On Leave'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='attendances'
    )
    date = models.DateField(default=timezone.now)
    punch_in = models.DateTimeField(null=True, blank=True)
    punch_out = models.DateTimeField(null=True, blank=True)
    punch_in_latitude = models.DecimalField(
        max_digits=10, decimal_places=7, null=True, blank=True
    )
    punch_in_longitude = models.DecimalField(
        max_digits=10, decimal_places=7, null=True, blank=True
    )
    punch_out_latitude = models.DecimalField(
        max_digits=10, decimal_places=7, null=True, blank=True
    )
    punch_out_longitude = models.DecimalField(
        max_digits=10, decimal_places=7, null=True, blank=True
    )
    punch_in_ip = models.GenericIPAddressField(null=True, blank=True)
    punch_out_ip = models.GenericIPAddressField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='present')
    working_hours = models.DecimalField(
        max_digits=4, decimal_places=2, default=0.00
    )
    is_off_day = models.BooleanField(default=False, help_text="True if employee worked on their weekly off day")
    is_wfh = models.BooleanField(default=False, help_text="True if employee worked from home")
    is_auto_punch_out = models.BooleanField(default=False, help_text="True if system auto punched out at 11 PM")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'attendance'
        unique_together = ('user', 'date')
        ordering = ['-date', '-punch_in']

    def calculate_working_hours(self):
        """
        Calculate working hours with break deduction.
        Office: 10 AM - 7 PM (9 hours)
        Break: 2 PM - 3 PM (1 hour)
        Effective working: 8 hours
        """
        if self.punch_in and self.punch_out:
            delta = self.punch_out - self.punch_in
            total_hours = delta.total_seconds() / 3600

            # Deduct break time if worked through break period
            punch_in_time = self.punch_in.time()
            punch_out_time = self.punch_out.time()

            # Check if work period overlaps with break time
            if punch_in_time < BREAK_END_TIME and punch_out_time > BREAK_START_TIME:
                # Calculate overlap with break period
                break_start = max(punch_in_time, BREAK_START_TIME)
                break_end = min(punch_out_time, BREAK_END_TIME)

                if break_start < break_end:
                    # There is overlap, deduct break time
                    total_hours -= BREAK_DURATION_HOURS

            self.working_hours = round(max(0, total_hours), 2)
            return self.working_hours
        return 0

    def determine_status(self):
        """
        Determine attendance status based on working hours.
        - >= 6 hours: Present (full day)
        - 4 to < 6 hours: Half Day
        - < 4 hours: Half Day (could be treated as absent based on policy)
        """
        if self.working_hours >= HALF_DAY_MAX_HOURS:
            return 'present'
        elif self.working_hours >= HALF_DAY_MIN_HOURS:
            return 'half_day'
        else:
            # Less than 4 hours - mark as half day (you can change to 'absent' if needed)
            return 'half_day'

    def save(self, *args, **kwargs):
        if self.punch_in and self.punch_out:
            self.calculate_working_hours()
            # Only auto-set status if it's currently 'present' (don't override on_leave, absent set by admin)
            if self.status == 'present':
                self.status = self.determine_status()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.name} - {self.date}"


class RegularizationRequest(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )
    REQUEST_TYPE_CHOICES = (
        ('missed_punch_in', 'Missed Punch In'),
        ('missed_punch_out', 'Missed Punch Out'),
        ('wrong_punch', 'Wrong Punch Time'),
        ('forgot_punch', 'Forgot to Punch'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='regularization_requests'
    )
    attendance = models.ForeignKey(
        Attendance,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='regularization_requests'
    )
    date = models.DateField()
    request_type = models.CharField(max_length=20, choices=REQUEST_TYPE_CHOICES)
    requested_punch_in = models.TimeField(null=True, blank=True)
    requested_punch_out = models.TimeField(null=True, blank=True)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_regularizations'
    )
    reviewed_on = models.DateTimeField(null=True, blank=True)
    review_remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'regularization_requests'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.name} - {self.date} - {self.request_type}"


class OfficeLocation(models.Model):
    name = models.CharField(max_length=100)
    latitude = models.DecimalField(max_digits=20, decimal_places=15)
    longitude = models.DecimalField(max_digits=20, decimal_places=15)
    radius_meters = models.IntegerField(default=50)
    allowed_ips = models.TextField(
        blank=True,
        help_text="Comma-separated list of allowed IP addresses"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'office_locations'

    def get_allowed_ips(self):
        if self.allowed_ips:
            return [ip.strip() for ip in self.allowed_ips.split(',')]
        return []

    def __str__(self):
        return self.name


class WFHRequest(models.Model):
    """Work From Home Request Model"""
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='wfh_requests'
    )
    date = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_wfh_requests'
    )
    reviewed_on = models.DateTimeField(null=True, blank=True)
    review_remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'wfh_requests'
        ordering = ['-created_at']
        unique_together = ('user', 'date')

    def __str__(self):
        return f"{self.user.name} - WFH - {self.date}"
