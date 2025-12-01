from django.db import models
from django.conf import settings
from django.utils import timezone


class LeaveType(models.Model):
    name = models.CharField(max_length=50, unique=True)
    code = models.CharField(max_length=10, unique=True)
    annual_quota = models.IntegerField(default=0)
    is_carry_forward = models.BooleanField(default=False)
    max_carry_forward = models.IntegerField(default=0)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'leave_types'

    def __str__(self):
        return f"{self.name} ({self.code})"


class LeaveBalance(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='leave_balances'
    )
    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.CASCADE,
        related_name='balances'
    )
    year = models.IntegerField()
    month = models.IntegerField(default=1)  # 1-12 for monthly tracking
    total_leaves = models.DecimalField(max_digits=5, decimal_places=1, default=5)  # 5 per month
    used_leaves = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    carried_forward = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    lop_days = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'leave_balances'
        unique_together = ('user', 'leave_type', 'year', 'month')

    @property
    def available_leaves(self):
        return self.total_leaves + self.carried_forward - self.used_leaves

    def __str__(self):
        return f"{self.user.name} - {self.leave_type.code} ({self.month}/{self.year})"


class LeaveRequest(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='leave_requests'
    )
    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.CASCADE,
        related_name='requests'
    )
    start_date = models.DateField()
    end_date = models.DateField()
    is_half_day = models.BooleanField(default=False)
    half_day_type = models.CharField(
        max_length=20,
        choices=(('first_half', 'First Half'), ('second_half', 'Second Half')),
        blank=True
    )
    total_days = models.DecimalField(max_digits=4, decimal_places=1, default=1)
    paid_days = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    lop_days = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    applied_on = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_leaves'
    )
    reviewed_on = models.DateTimeField(null=True, blank=True)
    review_remarks = models.TextField(blank=True)
    is_lop = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'leave_requests'
        ordering = ['-applied_on']

    def calculate_total_days(self):
        if self.is_half_day:
            self.total_days = 0.5
        else:
            delta = (self.end_date - self.start_date).days + 1
            self.total_days = delta
        return self.total_days

    def save(self, *args, **kwargs):
        self.calculate_total_days()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.name} - {self.leave_type.code} ({self.start_date} to {self.end_date})"


class Holiday(models.Model):
    name = models.CharField(max_length=100)
    date = models.DateField(unique=True)
    is_optional = models.BooleanField(default=False)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'holidays'
        ordering = ['date']

    def __str__(self):
        return f"{self.name} - {self.date}"
