"""
Signals for Leave app - sends email and in-app notifications when status changes
"""
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from .models import LeaveRequest
from accounts.email_utils import send_leave_status_email
from accounts.utils import create_notification


@receiver(pre_save, sender=LeaveRequest)
def store_previous_status(sender, instance, **kwargs):
    """Store the previous status before saving"""
    if instance.pk:
        try:
            old_instance = LeaveRequest.objects.get(pk=instance.pk)
            instance._previous_status = old_instance.status
        except LeaveRequest.DoesNotExist:
            instance._previous_status = None
    else:
        instance._previous_status = None


@receiver(post_save, sender=LeaveRequest)
def send_status_change_notification(sender, instance, created, **kwargs):
    """Send email and in-app notification when status changes (not on creation)"""
    if created:
        # Don't send on creation - that's handled by the view
        return

    previous_status = getattr(instance, '_previous_status', None)
    current_status = instance.status

    # Only send notification if status actually changed to approved or rejected
    if previous_status and previous_status != current_status:
        if current_status in ['approved', 'rejected']:
            status_text = 'approved' if current_status == 'approved' else 'rejected'
            notification_type = 'leave_approved' if current_status == 'approved' else 'leave_rejected'

            # In-app notification
            create_notification(
                user=instance.user,
                title=f"Leave Request {status_text.title()}",
                message=f"Your {instance.leave_type.name} leave request from {instance.start_date} to {instance.end_date} has been {status_text}.",
                notification_type=notification_type,
                related_id=instance.id
            )

            # Email notification
            send_leave_status_email(
                instance,
                current_status,
                instance.review_remarks or ''
            )
