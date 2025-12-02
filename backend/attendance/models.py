from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import time, timedelta, datetime

# Default Office Configuration (used when employee has no shift assigned)
DEFAULT_OFFICE_START = time(10, 0)   # 10:00 AM
DEFAULT_OFFICE_END = time(19, 0)     # 7:00 PM
DEFAULT_BREAK_START = time(14, 0)    # 2:00 PM
DEFAULT_BREAK_END = time(15, 0)      # 3:00 PM
DEFAULT_BREAK_DURATION = 1           # 1 hour break

# Working hours configuration
FULL_DAY_HOURS = 8               # 8 hours = full day
HALF_DAY_MIN_HOURS = 4           # Minimum 4 hours for half day
HALF_DAY_MAX_HOURS = 6           # Less than 6 hours = half day


class Shift(models.Model):
    """
    Shift model for different employee timings
    Example shifts:
    - Morning Shift: 10 AM - 7 PM
    - Day Shift: 11 AM - 8 PM
    - Late Shift: 12 PM - 9 PM
    """
    name = models.CharField(max_length=50, unique=True)
    start_time = models.TimeField(default=time(10, 0))
    end_time = models.TimeField(default=time(19, 0))
    break_start = models.TimeField(default=time(14, 0))
    break_end = models.TimeField(default=time(15, 0))
    break_duration_hours = models.DecimalField(max_digits=3, decimal_places=1, default=1.0)
    grace_period_minutes = models.IntegerField(default=10, help_text="Late arrival grace period in minutes")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'shifts'
        ordering = ['start_time']

    def get_total_hours(self):
        """Calculate total working hours for this shift (excluding break)"""
        start = datetime.combine(datetime.today(), self.start_time)
        end = datetime.combine(datetime.today(), self.end_time)
        total = (end - start).total_seconds() / 3600
        return total - float(self.break_duration_hours)

    def __str__(self):
        return f"{self.name} ({self.start_time.strftime('%I:%M %p')} - {self.end_time.strftime('%I:%M %p')})"


class CompOff(models.Model):
    """
    Compensatory Off - earned when employee works on off day/holiday
    """
    STATUS_CHOICES = (
        ('earned', 'Earned'),
        ('used', 'Used'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comp_offs'
    )
    earned_date = models.DateField(help_text="Date when comp off was earned (worked on off day)")
    earned_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    credit_days = models.DecimalField(max_digits=3, decimal_places=1, default=1.0, help_text="Comp off days credited")
    reason = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='earned')
    used_date = models.DateField(null=True, blank=True, help_text="Date when comp off was used")
    expires_on = models.DateField(null=True, blank=True, help_text="Comp off expires after this date")
    attendance = models.ForeignKey(
        'Attendance',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='comp_off_earned'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'comp_offs'
        ordering = ['-earned_date']

    def save(self, *args, **kwargs):
        # Set expiry date (90 days from earned date by default)
        if not self.expires_on and self.earned_date:
            self.expires_on = self.earned_date + timedelta(days=90)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.name} - Comp Off ({self.earned_date}) - {self.status}"


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

    def get_user_shift(self):
        """Get user's assigned shift or return default values"""
        if self.user.shift:
            return {
                'start_time': self.user.shift.start_time,
                'end_time': self.user.shift.end_time,
                'break_start': self.user.shift.break_start,
                'break_end': self.user.shift.break_end,
                'break_duration': float(self.user.shift.break_duration_hours),
                'grace_minutes': self.user.shift.grace_period_minutes,
            }
        # Return default values if no shift assigned
        return {
            'start_time': DEFAULT_OFFICE_START,
            'end_time': DEFAULT_OFFICE_END,
            'break_start': DEFAULT_BREAK_START,
            'break_end': DEFAULT_BREAK_END,
            'break_duration': DEFAULT_BREAK_DURATION,
            'grace_minutes': 10,
        }

    def calculate_working_hours(self):
        """
        Calculate working hours with break deduction based on employee's shift.
        """
        if self.punch_in and self.punch_out:
            delta = self.punch_out - self.punch_in
            total_hours = delta.total_seconds() / 3600

            # Get user's shift settings
            shift = self.get_user_shift()
            break_start = shift['break_start']
            break_end = shift['break_end']
            break_duration = shift['break_duration']

            # Deduct break time if worked through break period
            punch_in_time = self.punch_in.time()
            punch_out_time = self.punch_out.time()

            # Check if work period overlaps with break time
            if punch_in_time < break_end and punch_out_time > break_start:
                # There is overlap, deduct break time
                total_hours -= break_duration

            self.working_hours = round(max(0, total_hours), 2)
            return self.working_hours
        return 0

    def determine_status(self):
        """
        Determine attendance status based on working hours.
        - >= 6 hours: Present (full day)
        - 4 to < 6 hours: Half Day
        - < 4 hours: Half Day
        """
        if self.working_hours >= HALF_DAY_MAX_HOURS:
            return 'present'
        elif self.working_hours >= HALF_DAY_MIN_HOURS:
            return 'half_day'
        else:
            return 'half_day'

    def is_late(self):
        """Check if employee punched in late (after shift start + grace period)"""
        if not self.punch_in:
            return False
        shift = self.get_user_shift()
        grace_minutes = shift['grace_minutes']
        shift_start = shift['start_time']

        # Calculate latest allowed punch in time
        start_datetime = datetime.combine(self.date, shift_start)
        latest_allowed = start_datetime + timedelta(minutes=grace_minutes)

        return self.punch_in.time() > latest_allowed.time()

    def get_late_minutes(self):
        """Get how many minutes late the employee was"""
        if not self.punch_in or not self.is_late():
            return 0
        shift = self.get_user_shift()
        shift_start = datetime.combine(self.date, shift['start_time'])
        punch_in_dt = datetime.combine(self.date, self.punch_in.time())
        return int((punch_in_dt - shift_start).total_seconds() / 60)

    def is_early_leaving(self):
        """Check if employee left before shift end time"""
        if not self.punch_out:
            return False
        shift = self.get_user_shift()
        return self.punch_out.time() < shift['end_time']

    def get_early_leaving_minutes(self):
        """Get how many minutes early the employee left"""
        if not self.punch_out or not self.is_early_leaving():
            return 0
        shift = self.get_user_shift()
        shift_end = datetime.combine(self.date, shift['end_time'])
        punch_out_dt = datetime.combine(self.date, self.punch_out.time())
        return int((shift_end - punch_out_dt).total_seconds() / 60)

    def check_and_credit_comp_off(self):
        """
        Check if employee worked on off day/holiday and credit comp off.
        Returns True if comp off was credited.
        """
        from leaves.models import Holiday

        # Check if it's employee's weekly off day
        is_weekly_off = self.date.weekday() == self.user.weekly_off

        # Check if it's a holiday
        is_holiday = Holiday.objects.filter(date=self.date).exists()

        if (is_weekly_off or is_holiday) and self.working_hours >= HALF_DAY_MIN_HOURS:
            # Mark as off day work
            self.is_off_day = True

            # Calculate comp off credit (full day if >= 6 hours, half day otherwise)
            credit_days = 1.0 if self.working_hours >= HALF_DAY_MAX_HOURS else 0.5

            # Check if comp off already exists
            existing = CompOff.objects.filter(
                user=self.user,
                earned_date=self.date,
                status='earned'
            ).first()

            if not existing:
                reason = "Weekly Off Work" if is_weekly_off else "Holiday Work"
                CompOff.objects.create(
                    user=self.user,
                    earned_date=self.date,
                    earned_hours=self.working_hours,
                    credit_days=credit_days,
                    reason=reason,
                    attendance=self
                )
                return True
        return False

    def save(self, *args, **kwargs):
        if self.punch_in and self.punch_out:
            self.calculate_working_hours()
            # Only auto-set status if it's currently 'present'
            if self.status == 'present':
                self.status = self.determine_status()

        # Save first to get ID
        super().save(*args, **kwargs)

        # Check and credit comp off after save
        if self.punch_in and self.punch_out:
            self.check_and_credit_comp_off()

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
