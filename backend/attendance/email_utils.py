"""
Email utility functions for attendance notifications
"""
from django.core.mail import send_mail
from django.conf import settings
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


def send_auto_punch_out_email(attendance):
    """
    Send warning email to employee when system auto punches them out at 11 PM
    """
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')

    subject = "⚠️ Auto Punch Out Warning - You Forgot to Punch Out!"

    punch_in_time = attendance.punch_in.strftime('%I:%M %p') if attendance.punch_in else 'N/A'
    punch_out_time = attendance.punch_out.strftime('%I:%M %p') if attendance.punch_out else 'N/A'

    message = f"""
⚠️ AUTO PUNCH OUT WARNING ⚠️

Dear {attendance.user.name},

You forgot to punch out today! The system has automatically punched you out at 11:00 PM.

Attendance Details:
------------------
Date: {attendance.date.strftime('%d %b %Y')}
Punch In: {punch_in_time}
Punch Out: {punch_out_time} (Auto)
Working Hours: {attendance.working_hours} hours

⚠️ IMPORTANT:
- This record has been marked as "Auto Punch Out"
- If your actual punch out time was different, please apply for regularization
- Repeated auto punch outs may be flagged to HR

To submit a regularization request, visit: {frontend_url}/attendance

Please ensure to punch out properly before leaving office.

Regards,
Attendance Management System
    """

    html_message = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin-bottom: 20px;">
            <h2 style="color: #92400E; margin: 0;">⚠️ AUTO PUNCH OUT WARNING</h2>
        </div>

        <p>Dear <strong>{attendance.user.name}</strong>,</p>

        <p>You forgot to punch out today! The system has automatically punched you out at <strong>11:00 PM</strong>.</p>

        <div style="background: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">Attendance Details</h3>
            <table style="width: 100%;">
                <tr>
                    <td style="padding: 5px 0;"><strong>Date:</strong></td>
                    <td>{attendance.date.strftime('%d %b %Y')}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 0;"><strong>Punch In:</strong></td>
                    <td>{punch_in_time}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 0;"><strong>Punch Out:</strong></td>
                    <td style="color: #DC2626;">{punch_out_time} (Auto)</td>
                </tr>
                <tr>
                    <td style="padding: 5px 0;"><strong>Working Hours:</strong></td>
                    <td>{attendance.working_hours} hours</td>
                </tr>
            </table>
        </div>

        <div style="background: #FEE2E2; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #991B1B; margin-top: 0;">⚠️ IMPORTANT</h4>
            <ul style="color: #991B1B; margin-bottom: 0;">
                <li>This record has been marked as "Auto Punch Out"</li>
                <li>If your actual punch out time was different, please apply for regularization</li>
                <li>Repeated auto punch outs may be flagged to HR</li>
            </ul>
        </div>

        <p>
            <a href="{frontend_url}/attendance"
               style="display: inline-block; background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Apply for Regularization
            </a>
        </p>

        <p>Please ensure to punch out properly before leaving office.</p>

        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
        <p style="color: #6B7280; font-size: 12px;">
            This is an automated message from the Attendance Management System.
        </p>
    </div>
    """

    return send_email_notification(subject, message, attendance.user.email, html_message)


def send_email_to_admins_auto_punch_out_summary(auto_punched_employees):
    """
    Send summary email to admins about auto punch outs
    """
    from accounts.models import User

    if not auto_punched_employees:
        return

    admins = User.objects.filter(is_admin=True, email__isnull=False).exclude(email='')

    subject = f"Daily Auto Punch Out Report - {len(auto_punched_employees)} Employee(s)"

    employee_list = "\n".join([f"- {emp.user.name} (Punch In: {emp.punch_in.strftime('%I:%M %p')})"
                               for emp in auto_punched_employees])

    message = f"""
Daily Auto Punch Out Report

The following {len(auto_punched_employees)} employee(s) were auto punched out at 11:00 PM today:

{employee_list}

These employees forgot to punch out and have been sent warning emails.
    """

    for admin in admins:
        send_email_notification(subject, message, admin.email)
