"""
Management command to auto punch out employees who forgot to punch out.
Run this at 11 PM daily using cron/Task Scheduler.

Usage:
    python manage.py auto_punch_out

Windows Task Scheduler:
    Create a task that runs at 11:00 PM daily with action:
    Program: C:\path\to\venv\Scripts\python.exe
    Arguments: manage.py auto_punch_out
    Start in: C:\path\to\backend

Linux Cron:
    0 23 * * * cd /path/to/backend && /path/to/venv/bin/python manage.py auto_punch_out
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from attendance.models import Attendance
from attendance.email_utils import send_auto_punch_out_email
from datetime import datetime


class Command(BaseCommand):
    help = 'Auto punch out employees who forgot to punch out at 11 PM'

    def handle(self, *args, **options):
        today = timezone.now().date()
        now = timezone.now()

        # Find all attendance records for today where punch_in exists but punch_out is null
        pending_punch_outs = Attendance.objects.filter(
            date=today,
            punch_in__isnull=False,
            punch_out__isnull=True
        ).select_related('user')

        count = 0
        for attendance in pending_punch_outs:
            # Auto punch out at current time (11 PM)
            attendance.punch_out = now
            attendance.is_auto_punch_out = True
            attendance.notes = f"Auto punch out by system at 11:00 PM. Employee forgot to punch out."
            attendance.save()

            # Send warning email to employee
            try:
                send_auto_punch_out_email(attendance)
                self.stdout.write(
                    self.style.SUCCESS(f'Auto punched out and emailed: {attendance.user.name}')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'Auto punched out but email failed for {attendance.user.name}: {str(e)}')
                )

            count += 1

        if count > 0:
            self.stdout.write(
                self.style.SUCCESS(f'Successfully auto punched out {count} employee(s)')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS('No pending punch outs found')
            )
