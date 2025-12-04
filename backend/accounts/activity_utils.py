"""
Utility functions for logging activities
"""
from .models import ActivityLog


def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def log_activity(
    actor,
    activity_type,
    category,
    title,
    description='',
    target_user=None,
    related_model='',
    related_id=None,
    extra_data=None,
    ip_address=None,
    request=None
):
    """
    Log an activity to the ActivityLog model

    Args:
        actor: User who performed the action
        activity_type: Type of activity (from ACTIVITY_TYPES)
        category: Category of activity (from CATEGORY_CHOICES)
        title: Short title for the activity
        description: Detailed description (optional)
        target_user: User affected by the action (optional)
        related_model: Name of the related model (optional)
        related_id: ID of the related object (optional)
        extra_data: Additional JSON data (optional)
        ip_address: IP address (optional)
        request: Django request object to extract IP (optional)
    """
    # Get IP from request if not provided
    if request and not ip_address:
        ip_address = get_client_ip(request)

    return ActivityLog.objects.create(
        actor=actor,
        target_user=target_user,
        activity_type=activity_type,
        category=category,
        title=title,
        description=description,
        related_model=related_model,
        related_id=related_id,
        extra_data=extra_data,
        ip_address=ip_address
    )


# Convenience functions for common activities

def log_punch_in(user, attendance, request=None):
    """Log punch in activity"""
    return log_activity(
        actor=user,
        activity_type='punch_in',
        category='attendance',
        title=f'{user.name} punched in',
        description=f'Punch in at {attendance.punch_in.strftime("%I:%M %p")}',
        related_model='Attendance',
        related_id=attendance.id,
        request=request
    )


def log_punch_out(user, attendance, request=None):
    """Log punch out activity"""
    return log_activity(
        actor=user,
        activity_type='punch_out',
        category='attendance',
        title=f'{user.name} punched out',
        description=f'Punch out at {attendance.punch_out.strftime("%I:%M %p")} - {attendance.working_hours} hrs',
        related_model='Attendance',
        related_id=attendance.id,
        request=request
    )


def log_leave_applied(user, leave_request, request=None):
    """Log leave application"""
    return log_activity(
        actor=user,
        activity_type='leave_applied',
        category='leave',
        title=f'{user.name} applied for leave',
        description=f'{leave_request.leave_type.name} from {leave_request.start_date} to {leave_request.end_date}',
        related_model='LeaveRequest',
        related_id=leave_request.id,
        request=request
    )


def log_leave_reviewed(reviewer, leave_request, status, request=None):
    """Log leave approval/rejection"""
    activity_type = 'leave_approved' if status == 'approved' else 'leave_rejected'
    status_text = 'approved' if status == 'approved' else 'rejected'

    return log_activity(
        actor=reviewer,
        target_user=leave_request.user,
        activity_type=activity_type,
        category='leave',
        title=f'Admin {status_text} {leave_request.user.name}\'s leave',
        description=f'{leave_request.leave_type.name}: {leave_request.start_date} to {leave_request.end_date}',
        related_model='LeaveRequest',
        related_id=leave_request.id,
        request=request
    )


def log_regularization_applied(user, regularization, request=None):
    """Log regularization application"""
    return log_activity(
        actor=user,
        activity_type='regularization_applied',
        category='regularization',
        title=f'{user.name} applied for regularization',
        description=f'{regularization.request_type} for {regularization.date}',
        related_model='RegularizationRequest',
        related_id=regularization.id,
        request=request
    )


def log_regularization_reviewed(reviewer, regularization, status, request=None):
    """Log regularization approval/rejection"""
    activity_type = 'regularization_approved' if status == 'approved' else 'regularization_rejected'
    status_text = 'approved' if status == 'approved' else 'rejected'

    return log_activity(
        actor=reviewer,
        target_user=regularization.user,
        activity_type=activity_type,
        category='regularization',
        title=f'Admin {status_text} {regularization.user.name}\'s regularization',
        description=f'{regularization.request_type} for {regularization.date}',
        related_model='RegularizationRequest',
        related_id=regularization.id,
        request=request
    )


def log_employee_added(admin, employee, request=None):
    """Log new employee added"""
    return log_activity(
        actor=admin,
        target_user=employee,
        activity_type='employee_added',
        category='employee',
        title=f'Admin added new employee: {employee.name}',
        description=f'Department: {employee.department}, Designation: {employee.designation}',
        related_model='User',
        related_id=employee.id,
        request=request
    )


def log_employee_updated(admin, employee, changed_fields, request=None):
    """Log employee profile update by admin"""
    return log_activity(
        actor=admin,
        target_user=employee,
        activity_type='employee_updated',
        category='employee',
        title=f'Admin updated {employee.name}\'s profile',
        description=f'Changed: {", ".join(changed_fields)}' if changed_fields else '',
        related_model='User',
        related_id=employee.id,
        extra_data={'changed_fields': changed_fields},
        request=request
    )


def log_holiday_added(admin, holiday, request=None):
    """Log holiday added"""
    return log_activity(
        actor=admin,
        activity_type='holiday_added',
        category='holiday',
        title=f'Admin added holiday: {holiday.name}',
        description=f'Date: {holiday.date}',
        related_model='Holiday',
        related_id=holiday.id,
        request=request
    )


def log_shift_created(admin, shift, request=None):
    """Log shift created"""
    return log_activity(
        actor=admin,
        activity_type='shift_created',
        category='shift',
        title=f'Admin created shift: {shift.name}',
        description=f'{shift.start_time.strftime("%I:%M %p")} - {shift.end_time.strftime("%I:%M %p")}',
        related_model='Shift',
        related_id=shift.id,
        request=request
    )


def log_attendance_edit(admin, attendance, changes, request=None):
    """Log attendance edit by admin"""
    return log_activity(
        actor=admin,
        target_user=attendance.user,
        activity_type='attendance_edit',
        category='attendance',
        title=f'Admin edited {attendance.user.name}\'s attendance',
        description=f'Date: {attendance.date}',
        related_model='Attendance',
        related_id=attendance.id,
        extra_data={'changes': changes},
        request=request
    )


def log_wfh_applied(user, wfh_request, request=None):
    """Log WFH application"""
    return log_activity(
        actor=user,
        activity_type='wfh_applied',
        category='wfh',
        title=f'{user.name} applied for WFH',
        description=f'Date: {wfh_request.date}',
        related_model='WFHRequest',
        related_id=wfh_request.id,
        request=request
    )


def log_wfh_reviewed(reviewer, wfh_request, status, request=None):
    """Log WFH approval/rejection"""
    activity_type = 'wfh_approved' if status == 'approved' else 'wfh_rejected'
    status_text = 'approved' if status == 'approved' else 'rejected'

    return log_activity(
        actor=reviewer,
        target_user=wfh_request.user,
        activity_type=activity_type,
        category='wfh',
        title=f'Admin {status_text} {wfh_request.user.name}\'s WFH',
        description=f'Date: {wfh_request.date}',
        related_model='WFHRequest',
        related_id=wfh_request.id,
        request=request
    )


def log_profile_update_requested(user, profile_request, request=None):
    """Log profile update request"""
    return log_activity(
        actor=user,
        activity_type='profile_update_requested',
        category='profile',
        title=f'{user.name} requested profile update',
        description=f'Fields: {profile_request.changed_fields}',
        related_model='ProfileUpdateRequest',
        related_id=profile_request.id,
        request=request
    )


def log_profile_update_reviewed(reviewer, profile_request, status, request=None):
    """Log profile update approval/rejection"""
    activity_type = 'profile_update_approved' if status == 'approved' else 'profile_update_rejected'
    status_text = 'approved' if status == 'approved' else 'rejected'

    return log_activity(
        actor=reviewer,
        target_user=profile_request.user,
        activity_type=activity_type,
        category='profile',
        title=f'Admin {status_text} {profile_request.user.name}\'s profile update',
        description=f'Fields: {profile_request.changed_fields}',
        related_model='ProfileUpdateRequest',
        related_id=profile_request.id,
        request=request
    )
