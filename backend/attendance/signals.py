"""
Signals for Attendance app - sends email and in-app notifications when regularization status changes
"""
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from .models import RegularizationRequest
from accounts.email_utils import send_regularization_status_email
from accounts.utils import create_notification


@receiver(pre_save, sender=RegularizationRequest)
def store_previous_regularization_status(sender, instance, **kwargs):
    """Store the previous status before saving"""
    if instance.pk:
        try:
            old_instance = RegularizationRequest.objects.get(pk=instance.pk)
            instance._previous_status = old_instance.status
        except RegularizationRequest.DoesNotExist:
            instance._previous_status = None
    else:
        instance._previous_status = None


@receiver(post_save, sender=RegularizationRequest)
def send_regularization_status_change_notification(sender, instance, created, **kwargs):
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
            notification_type = 'regularization_approved' if current_status == 'approved' else 'regularization_rejected'

            # In-app notification
            create_notification(
                user=instance.user,
                title=f"Regularization {status_text.title()}",
                message=f"Your attendance regularization request for {instance.date} has been {status_text}.",
                notification_type=notification_type,
                related_id=instance.id
            )

            # Email notification
            send_regularization_status_email(
                instance,
                current_status,
                instance.review_remarks or ''
            )
