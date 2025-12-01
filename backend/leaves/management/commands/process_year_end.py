"""
Management command to process year-end leave calculations.
Run this at the end of each year (or first day of new year) to:
1. Calculate carry-forward leaves
2. Create new year balances
3. Reset used leaves

Usage:
    python manage.py process_year_end
    python manage.py process_year_end --year 2024  # For specific year
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import User
from leaves.models import LeaveType, LeaveBalance


class Command(BaseCommand):
    help = 'Process year-end leave calculations: carry-forward and new year initialization'

    def add_arguments(self, parser):
        parser.add_argument(
            '--year',
            type=int,
            help='The year to process (defaults to previous year)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes'
        )

    def handle(self, *args, **options):
        current_year = timezone.now().year
        process_year = options.get('year') or (current_year - 1)
        new_year = process_year + 1
        dry_run = options.get('dry_run', False)

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))

        self.stdout.write(f'Processing year-end for {process_year} -> {new_year}')

        employees = User.objects.filter(role='employee', is_active=True)
        leave_types = LeaveType.objects.filter(is_active=True)

        processed_count = 0
        carry_forward_count = 0

        for employee in employees:
            self.stdout.write(f'\nProcessing: {employee.name}')

            for leave_type in leave_types:
                # Get current year balance
                old_balance = LeaveBalance.objects.filter(
                    user=employee,
                    leave_type=leave_type,
                    year=process_year
                ).first()

                # Calculate carry forward
                carry_forward = 0
                if old_balance and leave_type.is_carry_forward:
                    unused = old_balance.available_leaves
                    if unused > 0:
                        carry_forward = min(unused, leave_type.max_carry_forward)
                        carry_forward_count += 1
                        self.stdout.write(
                            f'  {leave_type.code}: Carrying forward {carry_forward} days'
                        )

                if not dry_run:
                    # Create or update new year balance
                    new_balance, created = LeaveBalance.objects.get_or_create(
                        user=employee,
                        leave_type=leave_type,
                        year=new_year,
                        defaults={
                            'total_leaves': leave_type.annual_quota,
                            'carried_forward': carry_forward,
                            'used_leaves': 0,
                            'lop_days': 0
                        }
                    )

                    if not created and carry_forward > 0:
                        # Update existing balance with carry forward
                        new_balance.carried_forward = carry_forward
                        new_balance.save()

                processed_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'\nCompleted! Processed {processed_count} balances, '
            f'{carry_forward_count} carry-forwards applied.'
        ))

        if dry_run:
            self.stdout.write(self.style.WARNING(
                'This was a dry run. Run without --dry-run to apply changes.'
            ))
