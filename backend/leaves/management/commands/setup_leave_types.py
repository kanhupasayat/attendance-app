"""
Management command to set up default leave types.
Run once during initial setup.

Usage:
    python manage.py setup_leave_types
"""

from django.core.management.base import BaseCommand
from leaves.models import LeaveType


class Command(BaseCommand):
    help = 'Set up default leave types'

    def handle(self, *args, **options):
        leave_types = [
            {
                'name': 'Casual Leave',
                'code': 'CL',
                'annual_quota': 12,
                'is_carry_forward': False,
                'max_carry_forward': 0,
                'description': 'Casual leaves for personal work'
            },
            {
                'name': 'Sick Leave',
                'code': 'SL',
                'annual_quota': 6,
                'is_carry_forward': False,
                'max_carry_forward': 0,
                'description': 'Leaves for medical reasons'
            },
            {
                'name': 'Earned Leave',
                'code': 'EL',
                'annual_quota': 15,
                'is_carry_forward': True,
                'max_carry_forward': 30,
                'description': 'Earned/Privilege leaves that can be carried forward'
            },
            {
                'name': 'Loss of Pay',
                'code': 'LOP',
                'annual_quota': 0,
                'is_carry_forward': False,
                'max_carry_forward': 0,
                'description': 'Unpaid leave when balance is exhausted'
            },
        ]

        created_count = 0
        for lt_data in leave_types:
            lt, created = LeaveType.objects.get_or_create(
                code=lt_data['code'],
                defaults=lt_data
            )
            if created:
                created_count += 1
                self.stdout.write(f'Created: {lt.name} ({lt.code})')
            else:
                self.stdout.write(f'Already exists: {lt.name} ({lt.code})')

        self.stdout.write(self.style.SUCCESS(
            f'\nDone! Created {created_count} new leave types.'
        ))
