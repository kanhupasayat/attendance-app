"""
Signals for Accounts app - sends email and in-app notifications when profile update status changes
"""
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from .models import ProfileUpdateRequest, Notification
from .email_utils import send_profile_update_status_email


@receiver(pre_save, sender=ProfileUpdateRequest)
def store_previous_profile_status(sender, instance, **kwargs):
    """Store the previous status before saving"""
    if instance.pk:
        try:
            old_instance = ProfileUpdateRequest.objects.get(pk=instance.pk)
            instance._previous_status = old_instance.status
        except ProfileUpdateRequest.DoesNotExist:
            instance._previous_status = None
    else:
        instance._previous_status = None


@receiver(post_save, sender=ProfileUpdateRequest)
def send_profile_status_change_notification(sender, instance, created, **kwargs):
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
            notification_type = 'profile_update_approved' if current_status == 'approved' else 'profile_update_rejected'

            # In-app notification
            Notification.objects.create(
                user=instance.user,
                title=f"Profile Update {status_text.title()}",
                message=f"Your profile update request has been {status_text}.",
                notification_type=notification_type,
                related_id=instance.id
            )

            # Email notification
            send_profile_update_status_email(
                instance,
                current_status,
                instance.review_remarks or ''
            )
