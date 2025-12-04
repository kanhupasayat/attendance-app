import threading
from .models import Notification, User


def send_email_async(email_func, *args, **kwargs):
    """Send email in a separate thread to avoid blocking"""
    import logging
    logger = logging.getLogger(__name__)

    def run():
        try:
            logger.info(f"Attempting to send email via {email_func.__name__}")
            result = email_func(*args, **kwargs)
            logger.info(f"Email function {email_func.__name__} returned: {result}")
        except Exception as e:
            logger.error(f"Email sending failed: {e}", exc_info=True)

    thread = threading.Thread(target=run)
    thread.daemon = True
    thread.start()


def create_notification(user, title, message, notification_type='system', related_id=None):
    """Create a notification for a user"""
    return Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notification_type,
        related_id=related_id
    )


def notify_admins(title, message, notification_type='system', related_id=None):
    """Create notifications for all admin users"""
    admins = User.objects.filter(is_admin=True, is_active=True)
    notifications = []
    for admin in admins:
        notifications.append(
            Notification(
                user=admin,
                title=title,
                message=message,
                notification_type=notification_type,
                related_id=related_id
            )
        )
    Notification.objects.bulk_create(notifications)


def notify_leave_applied(leave_request):
    """Notify admins when a new leave request is submitted"""
    from .email_utils import send_leave_applied_email

    # In-app notification
    notify_admins(
        title="New Leave Request",
        message=f"{leave_request.user.name} has applied for {leave_request.leave_type.name} leave from {leave_request.start_date} to {leave_request.end_date}",
        notification_type='leave_applied',
        related_id=leave_request.id
    )
    # Email notification (async)
    send_email_async(send_leave_applied_email, leave_request)


def notify_leave_status(leave_request, status, remarks=''):
    """Notify employee when their leave request is approved/rejected"""
    from .email_utils import send_leave_status_email

    notification_type = 'leave_approved' if status == 'approved' else 'leave_rejected'
    status_text = 'approved' if status == 'approved' else 'rejected'

    # In-app notification
    create_notification(
        user=leave_request.user,
        title=f"Leave Request {status_text.title()}",
        message=f"Your {leave_request.leave_type.name} leave request from {leave_request.start_date} to {leave_request.end_date} has been {status_text}.",
        notification_type=notification_type,
        related_id=leave_request.id
    )
    # Email notification (async)
    send_email_async(send_leave_status_email, leave_request, status, remarks)


def notify_regularization_applied(regularization):
    """Notify admins when a new regularization request is submitted"""
    from .email_utils import send_regularization_applied_email

    # In-app notification
    notify_admins(
        title="New Regularization Request",
        message=f"{regularization.user.name} has applied for attendance regularization for {regularization.date}",
        notification_type='regularization_applied',
        related_id=regularization.id
    )
    # Email notification (async)
    send_email_async(send_regularization_applied_email, regularization)


def notify_regularization_status(regularization, status, remarks=''):
    """Notify employee when their regularization request is approved/rejected"""
    from .email_utils import send_regularization_status_email

    notification_type = 'regularization_approved' if status == 'approved' else 'regularization_rejected'
    status_text = 'approved' if status == 'approved' else 'rejected'

    # In-app notification
    create_notification(
        user=regularization.user,
        title=f"Regularization {status_text.title()}",
        message=f"Your attendance regularization request for {regularization.date} has been {status_text}.",
        notification_type=notification_type,
        related_id=regularization.id
    )
    # Email notification (async)
    send_email_async(send_regularization_status_email, regularization, status, remarks)


def notify_profile_update_applied(update_request):
    """Notify admins when an employee submits profile update request"""
    from .email_utils import send_profile_update_request_email

    # In-app notification
    notify_admins(
        title="Profile Update Request",
        message=f"{update_request.user.name} has submitted a profile update request.",
        notification_type='profile_update_requested',
        related_id=update_request.id
    )
    # Email notification (async)
    send_email_async(send_profile_update_request_email, update_request)


def notify_profile_update_status(update_request, status, remarks=''):
    """Notify employee when their profile update request is approved/rejected"""
    from .email_utils import send_profile_update_status_email

    notification_type = 'profile_update_approved' if status == 'approved' else 'profile_update_rejected'
    status_text = 'approved' if status == 'approved' else 'rejected'

    # In-app notification
    create_notification(
        user=update_request.user,
        title=f"Profile Update {status_text.title()}",
        message=f"Your profile update request has been {status_text}.",
        notification_type=notification_type,
        related_id=update_request.id
    )
    # Email notification (async)
    send_email_async(send_profile_update_status_email, update_request, status, remarks)


def notify_wfh_applied(wfh_request):
    """Notify admins when a new WFH request is submitted"""
    from .email_utils import send_wfh_applied_email

    # In-app notification
    notify_admins(
        title="New WFH Request",
        message=f"{wfh_request.user.name} has applied for Work From Home on {wfh_request.date}",
        notification_type='wfh_applied',
        related_id=wfh_request.id
    )
    # Email notification (async)
    send_email_async(send_wfh_applied_email, wfh_request)


def notify_wfh_status(wfh_request, status, remarks=''):
    """Notify employee when their WFH request is approved/rejected"""
    from .email_utils import send_wfh_status_email

    notification_type = 'wfh_approved' if status == 'approved' else 'wfh_rejected'
    status_text = 'approved' if status == 'approved' else 'rejected'

    # In-app notification
    create_notification(
        user=wfh_request.user,
        title=f"WFH Request {status_text.title()}",
        message=f"Your Work From Home request for {wfh_request.date} has been {status_text}.",
        notification_type=notification_type,
        related_id=wfh_request.id
    )
    # Email notification (async)
    send_email_async(send_wfh_status_email, wfh_request, status, remarks)


def notify_all_employees_holiday(holiday):
    """Notify all active employees when a new holiday is added"""
    from .email_utils import send_holiday_notification_email

    # Get all active employees
    employees = User.objects.filter(is_active=True)

    # Format date for display
    date_str = holiday.date.strftime('%d %b %Y')

    # Create in-app notifications for all employees
    notifications = []
    for employee in employees:
        notifications.append(
            Notification(
                user=employee,
                title=f"Holiday: {holiday.name}",
                message=f"Office will remain closed on {date_str} ({holiday.name}).",
                notification_type='holiday',
                related_id=holiday.id
            )
        )
    Notification.objects.bulk_create(notifications)

    # Get employee emails as a list (not queryset) for async thread
    employee_emails = list(employees.filter(email__isnull=False).exclude(email='').values_list('email', flat=True))
    holiday_name = holiday.name
    holiday_date = holiday.date

    # Send email notifications (async)
    send_email_async(send_holiday_notification_email, holiday_name, holiday_date, employee_emails)
