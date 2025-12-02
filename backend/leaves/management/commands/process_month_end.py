"""
Management command to process month-end leave calculations.
Run this at the end of each month (or first day of new month) to:
1. Convert unused sick leave (1 per month) to comp off
2. Carry forward unused leaves to next month

Usage:
    python manage.py process_month_end
    python manage.py process_month_end --month 11 --year 2024  # For specific month
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import User
from leaves.models import LeaveType, LeaveBalance
from attendance.models import CompOff
from datetime import date, timedelta


class Command(BaseCommand):
    help = 'Process month-end: convert unused sick leave to comp off'

    def add_arguments(self, parser):
        parser.add_argument(
            '--month',
            type=int,
            help='The month to process (1-12, defaults to previous month)'
        )
        parser.add_argument(
            '--year',
            type=int,
            help='The year to process (defaults to current year)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes'
        )

    def handle(self, *args, **options):
        today = timezone.now().date()

        # Default to previous month
        if options.get('month'):
            process_month = options['month']
            process_year = options.get('year') or today.year
        else:
            # Previous month
            if today.month == 1:
                process_month = 12
                process_year = today.year - 1
            else:
                process_month = today.month - 1
                process_year = today.year

        dry_run = options.get('dry_run', False)

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))

        self.stdout.write(f'Processing month-end for {process_month}/{process_year}')

        # Get sick leave type
        sick_leave = LeaveType.objects.filter(code='SL', is_active=True).first()
        if not sick_leave:
            self.stdout.write(self.style.ERROR('Sick Leave (SL) type not found!'))
            return

        employees = User.objects.filter(role='employee', is_active=True)

        comp_off_created = 0
        carry_forward_count = 0

        for employee in employees:
            self.stdout.write(f'\nProcessing: {employee.name}')

            # Get sick leave balance for the processed month
            sl_balance = LeaveBalance.objects.filter(
                user=employee,
                leave_type=sick_leave,
                year=process_year,
                month=process_month
            ).first()

            if sl_balance:
                # Each month gets 1 sick leave credit
                # If unused (used_leaves = 0), convert to comp off
                monthly_sick_leave = 1  # 1 sick leave per month

                # Check how much was used this month
                used_this_month = float(sl_balance.used_leaves)

                if used_this_month < monthly_sick_leave:
                    # Unused sick leave - convert to comp off
                    unused_days = monthly_sick_leave - used_this_month

                    self.stdout.write(
                        f'  Sick Leave: {used_this_month} used, {unused_days} unused -> Converting to Comp Off'
                    )

                    if not dry_run:
                        # Create comp off for unused sick leave
                        # Set earned_date as last day of the processed month
                        if process_month == 12:
                            last_day = date(process_year, 12, 31)
                        else:
                            last_day = date(process_year, process_month + 1, 1) - timedelta(days=1)

                        # Check if comp off already exists for this reason
                        existing = CompOff.objects.filter(
                            user=employee,
                            earned_date=last_day,
                            reason__contains='Unused Sick Leave'
                        ).first()

                        if not existing:
                            CompOff.objects.create(
                                user=employee,
                                earned_date=last_day,
                                earned_hours=unused_days * 8,  # 8 hours per day
                                credit_days=unused_days,
                                reason=f'Unused Sick Leave for {process_month}/{process_year}',
                                status='earned'
                            )
                            comp_off_created += 1
                            self.stdout.write(self.style.SUCCESS(
                                f'    Created Comp Off: {unused_days} days'
                            ))
                        else:
                            self.stdout.write(f'    Comp Off already exists for this month')
                else:
                    self.stdout.write(f'  Sick Leave fully used ({used_this_month} days)')
            else:
                # No balance record - employee didn't have sick leave balance
                # Create comp off for 1 day (monthly sick leave not used)
                self.stdout.write(f'  No sick leave balance found - granting 1 day comp off')

                if not dry_run:
                    if process_month == 12:
                        last_day = date(process_year, 12, 31)
                    else:
                        last_day = date(process_year, process_month + 1, 1) - timedelta(days=1)

                    existing = CompOff.objects.filter(
                        user=employee,
                        earned_date=last_day,
                        reason__contains='Unused Sick Leave'
                    ).first()

                    if not existing:
                        CompOff.objects.create(
                            user=employee,
                            earned_date=last_day,
                            earned_hours=8,
                            credit_days=1.0,
                            reason=f'Unused Sick Leave for {process_month}/{process_year}',
                            status='earned'
                        )
                        comp_off_created += 1

        self.stdout.write(self.style.SUCCESS(
            f'\nCompleted! Created {comp_off_created} comp offs from unused sick leaves.'
        ))

        if dry_run:
            self.stdout.write(self.style.WARNING(
                'This was a dry run. Run without --dry-run to apply changes.'
            ))
