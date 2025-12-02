"""
Email utility functions for sending notifications
"""
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import logging

logger = logging.getLogger(__name__)


def send_email_notification(subject, message, recipient_email, html_message=None):
    """
    Send email notification to a single recipient
    """
    if not recipient_email:
        logger.warning(f"No email provided for notification: {subject}")
        return False

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"Email sent successfully to {recipient_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {recipient_email}: {e}")
        return False


def send_email_to_admins(subject, message, html_message=None):
    """
    Send email notification to all admin users
    """
    from .models import User
    admins = User.objects.filter(is_admin=True, email__isnull=False).exclude(email='')

    for admin in admins:
        send_email_notification(subject, message, admin.email, html_message)


# ================== LEAVE NOTIFICATIONS ==================

def send_leave_applied_email(leave_request):
    """
    Send email to admin when employee applies for leave
    """
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    subject = f"New Leave Request - {leave_request.user.name}"
    message = f"""
New Leave Request Submitted

Employee: {leave_request.user.name}
Department: {leave_request.user.department or 'N/A'}
Leave Type: {leave_request.leave_type.name}
From: {leave_request.start_date.strftime('%d %b %Y')}
To: {leave_request.end_date.strftime('%d %b %Y')}
Days: {leave_request.total_days}
Reason: {leave_request.reason}

Click here to review: {frontend_url}/admin/leaves
    """
    send_email_to_admins(subject, message)


def send_leave_status_email(leave_request, action, remarks=''):
    """
    Send email to employee when leave is approved/rejected
    """
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    status_text = 'Approved' if action == 'approved' else 'Rejected'
    subject = f"Leave Request {status_text}"

    message = f"""
Your Leave Request has been {status_text}

Leave Type: {leave_request.leave_type.name}
From: {leave_request.start_date.strftime('%d %b %Y')}
To: {leave_request.end_date.strftime('%d %b %Y')}
Days: {leave_request.total_days}
Status: {status_text}
"""
    if remarks:
        message += f"Remarks: {remarks}\n"

    if action == 'approved':
        message += "\nYour leave has been approved. Enjoy your time off!"
    else:
        message += "\nPlease contact HR if you have any questions."

    message += f"\n\nView your leaves: {frontend_url}/leaves"

    send_email_notification(subject, message, leave_request.user.email)


# ================== PROFILE UPDATE NOTIFICATIONS ==================

def send_profile_update_request_email(update_request):
    """
    Send email to admin when employee submits profile update request
    """
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    subject = f"Profile Update Request - {update_request.user.name}"

    changed_fields = update_request.changed_fields.split(',') if update_request.changed_fields else []
    fields_text = ', '.join(changed_fields)

    message = f"""
New Profile Update Request

Employee: {update_request.user.name}
Mobile: {update_request.user.mobile}
Department: {update_request.user.department or 'N/A'}

Requested Changes: {fields_text}
Reason: {update_request.reason or 'Not provided'}

Click here to review: {frontend_url}/admin/profile-requests
    """
    send_email_to_admins(subject, message)


def send_profile_update_status_email(update_request, action, remarks=''):
    """
    Send email to employee when profile update is approved/rejected
    """
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    status_text = 'Approved' if action == 'approved' else 'Rejected'
    subject = f"Profile Update Request {status_text}"

    changed_fields = update_request.changed_fields.split(',') if update_request.changed_fields else []
    fields_text = ', '.join(changed_fields)

    message = f"""
Your Profile Update Request has been {status_text}

Requested Changes: {fields_text}
Status: {status_text}
"""
    if remarks:
        message += f"Remarks: {remarks}\n"

    if action == 'approved':
        message += "\nYour profile has been updated successfully."
    else:
        message += "\nPlease contact HR if you have any questions."

    message += f"\n\nView your profile: {frontend_url}/profile"

    send_email_notification(subject, message, update_request.user.email)


# ================== REGULARIZATION NOTIFICATIONS ==================

def send_regularization_applied_email(regularization):
    """
    Send email to admin when employee applies for regularization
    """
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    subject = f"Attendance Regularization Request - {regularization.user.name}"

    request_type_display = {
        'missed_punch_in': 'Missed Punch In',
        'missed_punch_out': 'Missed Punch Out',
        'wrong_punch': 'Wrong Punch Time',
        'forgot_punch': 'Forgot to Punch',
    }

    message = f"""
New Attendance Regularization Request

Employee: {regularization.user.name}
Department: {regularization.user.department or 'N/A'}
Date: {regularization.date.strftime('%d %b %Y')}
Request Type: {request_type_display.get(regularization.request_type, regularization.request_type)}
Requested Punch In: {regularization.requested_punch_in or 'N/A'}
Requested Punch Out: {regularization.requested_punch_out or 'N/A'}
Reason: {regularization.reason}

Click here to review: {frontend_url}/admin/regularization
    """
    send_email_to_admins(subject, message)


def send_regularization_status_email(regularization, action, remarks=''):
    """
    Send email to employee when regularization is approved/rejected
    """
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    status_text = 'Approved' if action == 'approved' else 'Rejected'
    subject = f"Regularization Request {status_text}"

    message = f"""
Your Attendance Regularization Request has been {status_text}

Date: {regularization.date.strftime('%d %b %Y')}
Requested Punch In: {regularization.requested_punch_in or 'N/A'}
Requested Punch Out: {regularization.requested_punch_out or 'N/A'}
Status: {status_text}
"""
    if remarks:
        message += f"Remarks: {remarks}\n"

    if action == 'approved':
        message += "\nYour attendance has been regularized successfully."
    else:
        message += "\nPlease contact HR if you have any questions."

    message += f"\n\nView your attendance: {frontend_url}/attendance"

    send_email_notification(subject, message, regularization.user.email)


# ================== WFH (WORK FROM HOME) NOTIFICATIONS ==================

def send_wfh_applied_email(wfh_request):
    """
    Send email to admin when employee applies for WFH
    """
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    subject = f"Work From Home Request - {wfh_request.user.name}"

    message = f"""
New Work From Home Request

Employee: {wfh_request.user.name}
Department: {wfh_request.user.department or 'N/A'}
Date: {wfh_request.date.strftime('%d %b %Y')}
Reason: {wfh_request.reason}

Click here to review: {frontend_url}/admin/wfh-requests
    """
    send_email_to_admins(subject, message)


def send_wfh_status_email(wfh_request, action, remarks=''):
    """
    Send email to employee when WFH is approved/rejected
    """
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    status_text = 'Approved' if action == 'approved' else 'Rejected'
    subject = f"WFH Request {status_text}"

    message = f"""
Your Work From Home Request has been {status_text}

Date: {wfh_request.date.strftime('%d %b %Y')}
Status: {status_text}
"""
    if remarks:
        message += f"Remarks: {remarks}\n"

    if action == 'approved':
        message += "\nYou can now punch in/out from anywhere on this date."
    else:
        message += "\nPlease contact HR if you have any questions."

    message += f"\n\nView your WFH requests: {frontend_url}/wfh"

    send_email_notification(subject, message, wfh_request.user.email)


# ================== HOLIDAY NOTIFICATIONS ==================

def send_holiday_notification_email(holiday_name, holiday_date, employee_emails):
    """
    Send email to all employees when a new holiday is added
    """
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    subject = f"Holiday Announcement: {holiday_name}"

    date_str = holiday_date.strftime('%d %b %Y')
    day_name = holiday_date.strftime('%A')

    message = f"""
Holiday Announcement

Office will remain closed on {date_str} ({day_name}) for {holiday_name}.

Enjoy your holiday!

View holiday calendar: {frontend_url}/holidays
    """

    # Send email to each employee
    for email in employee_emails:
        send_email_notification(subject, message, email)
